/**
 * The SharedWorker side of Strophe's worker-based connection sharing:
 * multiple tabs (ports) share the single websocket connection managed here.
 *
 * Exactly one live port holds the 'primary' role and it drives the XMPP stream
 * (handshake, and at the application layer it is the tab that should respond
 * to stanzas). All other ports are 'secondary' and attach to the shared
 * session.
 *
 * The worker sends pings to probe port liveness. Pages answer from their
 * message handler, which browsers do not throttle. A silent port keeps
 * receiving broadcasts (a frozen tab replays them on thaw) until it has
 * been quiet for so long that it must be gone for good (30 mins).
 *
 * This file is built as a self-contained classic-worker script
 * (`dist/shared-connection-worker.js`) keep it free of DOM dependencies.
 */
import { SHARED_WORKER_PROTOCOL_VERSION, Status } from './constants';
import StreamManagement from './stream-management/engine';
import { peekElement } from './stream-management/parse';

/** How often the worker pings its ports (and sweeps for gone ones). */
export const PING_INTERVAL = 30_000;

/**
 * How long the primary may stay silent before the worker fails over to the
 * freshest other port. Pongs are posted from the page's message handler,
 * which runs even in background-throttled tabs, so silence this long means
 * the tab is frozen, crashed or gone — not merely backgrounded.
 */
export const PRIMARY_TIMEOUT = 70_000;

/**
 * How long any port may stay silent before it is dropped entirely. Generous:
 * a frozen tab posts nothing but keeps its MessagePort, and every broadcast
 * posted to it while frozen is delivered when it thaws — dropping it early
 * would forfeit that replay. A dropped port that speaks again is re-admitted.
 */
export const PORT_GC_TIMEOUT = 30 * 60_000;

/** How long the socket is kept open after the last port has gone away. */
export const SOCKET_GRACE = 10_000;

/** The page→worker methods that may be invoked via postMessage. */
const METHODS = [
    '_connect',
    '_attach',
    '_pong',
    '_relinquish',
    'send',
    'close',
    '_closeSocket',
    '_smFeatures',
    '_bound',
];

/**
 * The subset of METHODS that presumes a live socket. When one arrives after
 * the socket died, the sender is answered with _onClose instead of having
 * its message dropped into the void (see _onPortMessage).
 */
const SESSION_METHODS = ['send', 'close', '_smFeatures', '_bound'];

type Role = 'primary' | 'secondary';

interface PortInfo {
    role: Role;
    lastSeen: number;
}

/**
 * Manages the shared websocket connection as well as the ports of the
 * connected tabs.
 */
class ConnectionManager {
    ports: Map<MessagePort, PortInfo>;
    jid: string;
    service: string;
    socket: WebSocket | null;
    /**
     * Where the shared stream is in its lifecycle. 'connecting' spans from
     * socket creation until the primary reports the bound JID (_bound) or a
     * worker-driven resumption succeeds; only in 'established' are join
     * requests answered — earlier ones wait in _pendingJoins.
     */
    session: 'none' | 'connecting' | 'established';
    /**
     * The worker-resident XEP-0198 engine (created lazily on the first SM
     * negotiation). The worker is the only party that sees all inbound
     * traffic (one socket) and all outbound traffic (every port's send
     * relays through here), so it is the only correct owner of the SM
     * counters and queue once more than one tab sends — a stanza sent from
     * a secondary tab survives resumption, and failover needs no reconnect.
     */
    sm: StreamManagement | null;
    /** Ports whose join arrived while the handshake was still in flight. */
    private _pendingJoins: MessagePort[];
    private _sweepTimer: ReturnType<typeof setInterval>;
    private _graceTimer: ReturnType<typeof setTimeout>;

    constructor() {
        this.ports = new Map();
        this.socket = null;
        this.session = 'none';
        this.sm = null;
        this._pendingJoins = [];
        this._sweepTimer = null;
        this._graceTimer = null;
    }

    /**
     * Register a newly connected port. It is admitted (and given a role) when
     * it first speaks.
     */
    addPort(port: MessagePort): void {
        port.addEventListener('message', (e: MessageEvent) => this._onPortMessage(port, e));
        port.start();
        if (!this._sweepTimer) {
            this._sweepTimer = setInterval(() => this._sweep(), PING_INTERVAL);
        }
    }

    /**
     * Dispatch a message from a port. Any message counts as liveness; a port
     * that was dropped (e.g. a long-frozen tab) is re-admitted here.
     */
    private _onPortMessage(port: MessagePort, e: MessageEvent): void {
        const [method, ...args] = e.data as [string, ...unknown[]];
        if (method === '_bye') {
            this._bye(port);
            return;
        }
        if (!METHODS.includes(method)) {
            this._post(port, 'log', 'error', `Found unhandled service worker message: ${method}`);
            return;
        }
        const info = this.ports.get(port);
        if (info) {
            info.lastSeen = Date.now();
        } else {
            // New port, or a dropped one speaking again (§ re-admission).
            const role: Role = this._hasPrimary() ? 'secondary' : 'primary';
            this.ports.set(port, { role, lastSeen: Date.now() });
            if (method !== '_connect' && method !== '_attach') {
                if (this._socketLive()) {
                    // Keep the page's role in sync — this demotes a stale
                    // primary (e.g. a frozen tab that was failed over while
                    // suspended).
                    this._post(port, '_role', role, this.jid);
                } else {
                    // The tab believes it belongs to a session that no longer
                    // exists (the socket died or was grace-closed while it was
                    // away). Tell it, so it reconnects instead of staying
                    // wedged in a connected-looking state.
                    this._post(port, '_onClose', 'The shared socket is gone');
                }
            }
        }
        if (SESSION_METHODS.includes(method) && !this._socketReady()) {
            // The tab is talking to a dead (or still-connecting) socket —
            // no legitimate sender exists before the socket opens, since the
            // primary only starts the stream in reaction to _onOpen. Salvage
            // what can be salvaged and make reality visible instead of
            // dropping the message into the void (a send() on a CONNECTING
            // socket would throw and lose the frame).
            if (method === 'send') {
                this._salvageFrame(port, args[0] as string);
            }
            this._post(port, '_onClose', 'The shared socket is gone');
            return;
        }
        this._cancelGrace();
        try {
            (this as unknown as Record<string, (port: MessagePort, ...args: unknown[]) => void>)[method](port, ...args);
        } catch (err) {
            console?.error(err);
        }
    }

    /**
     * Connect, or (when a live socket for the same user already exists)
     * join the shared session as a secondary instead of reconnecting (§2.5).
     * The first joiner becomes primary and drives the connection.
     */
    _connect(port: MessagePort, service: string, jid: string, version?: number): void {
        if (!this._checkVersion(port, version)) {
            return;
        }
        const sameUser = !this.jid || !jid || jid.split('/')[0].toLowerCase() === this.jid.split('/')[0].toLowerCase();
        if (this._socketLive() && sameUser) {
            this._joinShared(port);
            return;
        }
        this.service = service;
        this.jid = jid;

        // Per-stream SM state starts fresh; resumable state is reloaded from
        // the engine's storage when the primary reports SM support
        // (_smFeatures), mirroring the page-side connect() flow.
        this.sm?.reset();

        // This port drives the new connection and becomes primary.
        for (const [p, info] of this.ports) {
            if (p !== port && info.role === 'primary') {
                info.role = 'secondary';
                this._post(p, '_role', 'secondary', this.jid);
            }
        }
        this.ports.get(port).role = 'primary';
        this._post(port, '_role', 'primary', this.jid);
        this._closeSocket();
        this.session = 'connecting';
        this.socket = new WebSocket(service, 'xmpp');
        // _onOpen goes only to the connecting (primary) port: every tab's
        // Websocket layer reacts to it by sending a stream-<open/>, and a
        // still-attached secondary doing so would corrupt the new stream.
        this.socket.onopen = () => this._post(port, '_onOpen');
        this.socket.onerror = (e) => this._onError(e);
        this.socket.onclose = (e) => this._onClose(e);
        this.socket.onmessage = (message) => this._onMessage(message);
    }

    /**
     * Attach to the shared session, if there is one.
     * @param port
     * @param _service
     * @param version - The page's SHARED_WORKER_PROTOCOL_VERSION.
     */
    _attach(port: MessagePort, _service?: string, version?: number): void {
        if (!this._checkVersion(port, version)) {
            return;
        }
        if (this._socketLive()) {
            this._joinShared(port);
        } else {
            this._post(port, '_attachCallback', Status.ATTACHFAIL);
        }
    }

    /**
     * The primary reports that the post-SASL stream features advertise
     * XEP-0198 (§2.3). This is the resume-vs-bind decision point: only the
     * worker knows whether resumable state exists, so it either sends
     * <resume/> itself (answering with _smResumed/_smFailed once the server
     * replies) or tells the requesting port to proceed with binding.
     * @param port
     */
    _smFeatures(port: MessagePort): void {
        const sm = this._ensureSM();
        sm.serverSupported = true;
        sm.initialize(this.jid);
        if (sm.hasResumableState()) {
            sm.sendResume();
        } else {
            this._post(port, '_smNoState');
        }
    }

    /**
     * The primary reports that the connect flow completed (resource bound,
     * or legacy auth/session establishment finished): adopt the bound JID as
     * the shared one so attaching secondaries and promotions hand out a
     * resource the server actually knows about, start a fresh SM session if
     * this stream's features advertised support (_smFeatures), and release
     * any joins parked on the handshake. The <enable/> is written before the
     * parked joins drain, so it precedes anything a newly attached tab sends.
     * @param _port
     * @param jid - The server-assigned full JID.
     */
    _bound(_port: MessagePort, jid: string): void {
        this.jid = jid;
        if (this.sm?.serverSupported) {
            this.sm.sendEnable(jid);
        }
        this._sessionEstablished();
    }

    /**
     * Lazily create the worker-resident engine. Its nonzas go straight to
     * the socket (outbound frames relay in receipt order, so nothing can be
     * overtaken), and its lifecycle events are forwarded to the tabs as the
     * _smEnabled/_smResumed/_smFailed messages that feed the page-side
     * mirrors and drive the primary's connect flow.
     */
    private _ensureSM(): StreamManagement {
        if (!this.sm) {
            const sm = new StreamManagement((data: string) => {
                this.socket?.send(data);
            });
            sm.onEnabled = () => this._broadcast('_smEnabled', sm.state.id, sm.state.max, sm.state.boundJid);
            sm.onResumed = () => {
                this.jid = sm.boundJid;
                // The resumed session is established: release parked joins
                // (with the bound JID) before the mirrors hear about it.
                this._sessionEstablished();
                this._broadcast('_smResumed', sm.boundJid);
            };
            // Only a failed *resumption* concerns the tabs (the primary must
            // fall back to binding); a refused <enable/> just means this
            // stream runs without SM.
            sm.onFailed = (_view, resumeFailed) => {
                if (resumeFailed) {
                    this._broadcast('_smFailed');
                }
            };
            this.sm = sm;
        }
        return this.sm;
    }

    /**
     * Liveness reply to the worker's _ping. The lastSeen update happens in
     * the dispatcher, so any message from a port counts. This method only
     * needs to exist.
     * @param _port
     */
    _pong(_port: MessagePort): void {
        return;
    }

    /**
     * The page announces it is about to be frozen (its CPU stops): hand the
     * primary role to the freshest other port right away instead of making
     * the worker discover the freeze through missed pongs.
     * @param port
     */
    _relinquish(port: MessagePort): void {
        const info = this.ports.get(port);
        if (info?.role !== 'primary') {
            return;
        }
        if (this.session === 'connecting') {
            this._primaryLost();
            return;
        }
        // With no other port, the tab keeps the role and resumes as primary.
        this._failover(port);
    }

    /**
     * Graceful removal (sent from pagehide). If the primary leaves, the next
     * live port is promoted on the same socket.
     * @param port
     */
    _bye(port: MessagePort): void {
        const info = this.ports.get(port);
        if (!info) return;
        this.ports.delete(port);
        if (info.role === 'primary') {
            this._primaryLost();
        }
        if (this.ports.size === 0) {
            this._startGrace();
        }
    }

    /**
     * Relay an outbound frame to the socket, feeding it to the XEP-0198
     * engine and reflecting messages/presences to the other tabs.
     * @param port
     * @param data
     */
    send(port: MessagePort, data: string): void {
        const view = peekElement(data);
        if (view?.name === 'close') {
            // A stream-closing <close/> triggers the final ack + state clearing,
            // and the engine writes that final <a/> straight to the socket, so
            // onGracefulClose() must run *before* the close frame goes out.
            this.sm?.onGracefulClose();
            this.socket.send(data);
            return;
        }

        this.socket.send(data);
        if (this.sm) {
            if (view) {
                // A countable stanza is tracked *after* it is written, because
                // trackOutbound() may emit an <r/> which should ride behind the
                // stanza it covers.
                this.sm.trackOutbound(view);
            } else {
                this._warnUnpeekable('outbound', data);
            }
        }
        if (view) {
            this._reflect(port, view.name, data);
        }
    }

    /**
     * Reflect an outbound message/presence to every tab except the sender,
     * so all tabs can render what any one of them sent. Delivered as its own
     * `_onStanzaSent` page message — never as `_onMessage` — because a sent
     * stanza must not enter the receiving tabs' inbound pipeline (stanza
     * handlers, SM counting, xmlInput). IQs are not reflected: they are
     * request/response traffic private to the sending tab.
     * @param sender - The port the stanza came from (gets no reflection).
     * @param name - The frame's tag name (from the peeker).
     * @param data - The raw outbound frame.
     */
    private _reflect(sender: MessagePort, name: string, data: string): void {
        if (name !== 'message' && name !== 'presence') {
            return;
        }
        for (const [port] of this.ports) {
            if (port !== sender) {
                this._post(port, '_onStanzaSent', data);
            }
        }
    }

    /**
     * Send the stream-closing frame before disconnecting.
     * @param port
     * @param data
     */
    close(port: MessagePort, data: string): void {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            try {
                this.sm?.onGracefulClose();
                this.socket.send(data);
            } catch (e) {
                this._post(port, 'log', 'error', e);
                this._post(port, 'log', 'error', "Couldn't send <close /> tag.");
            }
        }
    }

    /**
     * Explicitly close the shared socket (a deliberate disconnect/logout —
     * a mere tab close sends `_bye` instead). Joins parked on the handshake
     * are answered with ATTACHFAIL: the session they were waiting for is
     * not going to happen.
     * @param _port
     */
    _closeSocket(_port?: MessagePort): void {
        this.session = 'none';
        this._failPendingJoins();
        if (this.socket) {
            try {
                this.socket.onclose = null;
                this.socket.onerror = null;
                this.socket.onmessage = null;
                this.socket.close();
            } catch (e) {
                this.ports.forEach((_info, p) => this._post(p, 'log', 'error', e));
            }
        }
        this.socket = null;
    }

    /**
     * @param e
     */
    _onClose(e: CloseEvent): void {
        this.session = 'none';
        this._failPendingJoins();
        this._broadcast('_onClose', e.reason);
    }

    /**
     * Deliver an inbound frame to the tabs, feeding it to the XEP-0198
     * engine first: counting and <r/> → <a/> replies happen exactly once.
     * Lifecycle transitions (<enabled/>/<resumed/>/<failed/>) surface
     * through the engine's event hooks (see _ensureSM).
     *
     * Until the session is established, frames go only to the primary,
     * since only it is responsible for SASL negotiation and session setup.
     * Once established, frames are broadcast to all tabs.
     * @param message
     */
    _onMessage(message: MessageEvent): void {
        if (this.sm && typeof message.data === 'string') {
            const view = peekElement(message.data);
            if (view) {
                this.sm.onInbound(view);
            } else {
                this._warnUnpeekable('inbound', message.data);
            }
        }
        if (this.session === 'established') {
            this._broadcast('_onMessage', { data: message.data });
        } else {
            const primary = this._primaryPort();
            if (primary) {
                this._post(primary, '_onMessage', { data: message.data });
            }
        }
    }

    /**
     * @param error
     */
    _onError(error: Event): void {
        this._broadcast('_onError', error);
    }

    /**
     * Verify that the page and this worker were built against the same
     * page↔worker protocol. On mismatch the port is refused (and told the
     * socket is closed, so the page fails loudly rather than misbehaving).
     * @param port
     * @param version - The version the page sent along with _connect/_attach.
     * @returns true when the page speaks this worker's protocol.
     */
    private _checkVersion(port: MessagePort, version?: number): boolean {
        if (version === SHARED_WORKER_PROTOCOL_VERSION) {
            return true;
        }
        this._post(
            port,
            'log',
            'fatal',
            `Shared connection worker protocol mismatch (page: ${version}, worker: ` +
                `${SHARED_WORKER_PROTOCOL_VERSION}) — the page and dist/shared-connection-worker.js ` +
                `are from different builds`,
        );
        this._post(port, '_onClose', 'Shared connection worker protocol mismatch');
        this.ports.delete(port);
        return false;
    }

    /**
     * @returns true when the socket exists and is not closing/closed. A
     *     CONNECTING socket counts: joins arriving during the handshake must
     *     be parked, not refused.
     */
    private _socketLive(): boolean {
        return (
            this.socket && this.socket.readyState !== WebSocket.CLOSED && this.socket.readyState !== WebSocket.CLOSING
        );
    }

    /**
     * @returns true when the socket is OPEN, i.e. ready to carry frames.
     */
    private _socketReady(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    /**
     * @returns true if any live port currently holds the primary role.
     */
    private _hasPrimary(): boolean {
        return this._primaryPort() !== null;
    }

    /**
     * @returns The port currently holding the primary role, or null.
     */
    private _primaryPort(): MessagePort | null {
        for (const [port, info] of this.ports) {
            if (info.role === 'primary') return port;
        }
        return null;
    }

    /**
     * Join a port onto the shared session: it becomes secondary (or primary,
     * if no primary is left) and is attached. Joins that arrive while the
     * handshake is still in flight are parked.
     */
    private _joinShared(port: MessagePort): void {
        if (this.session !== 'established') {
            if (!this._pendingJoins.includes(port)) {
                this._pendingJoins.push(port);
            }
            return;
        }
        const info = this.ports.get(port);
        let hasOtherPrimary = false;
        for (const [p, i] of this.ports) {
            if (p !== port && i.role === 'primary') {
                hasOtherPrimary = true;
                break;
            }
        }
        info.role = hasOtherPrimary ? 'secondary' : info.role;
        this._post(port, '_role', info.role, this.jid);
        this._post(port, '_attachCallback', Status.ATTACHED, this.jid);
    }

    /**
     * The stream reached its usable state (resource bound or resumed):
     * record it and answer the joins that were parked on the handshake.
     */
    private _sessionEstablished(): void {
        this.session = 'established';
        const pending = this._pendingJoins;
        this._pendingJoins = [];
        pending.filter((p) => this.ports.has(p)).forEach((p) => this._joinShared(p));
    }

    /**
     * Answer parked joins with ATTACHFAIL — the session they were waiting
     * for died before it was established.
     */
    private _failPendingJoins(): void {
        const pending = this._pendingJoins;
        this._pendingJoins = [];
        pending.forEach((p) => this._post(p, '_attachCallback', Status.ATTACHFAIL));
    }

    /**
     * The primary is gone (bye, GC or freeze). If the session is established
     * the freshest remaining port takes over on the same socket. If the
     * handshake was still in flight, nobody else can finish it (only the
     * primary holds credentials): kill the socket so the remaining tabs
     * reconnect and elect a new primary.
     */
    private _primaryLost(): void {
        if (this.session === 'connecting') {
            this._closeSocket();
            this._broadcast('_onClose', 'The connection-driving tab went away during the handshake');
        } else {
            this._promoteNext();
        }
    }

    /**
     * Promote the freshest port to primary — same socket, no reconnect.
     * @param exclude - A port that must not be picked (e.g. the one
     *     relinquishing the role).
     */
    private _promoteNext(exclude?: MessagePort): void {
        const next = this._freshestPort(exclude);
        if (!next) return;
        this.ports.get(next).role = 'primary';
        this._post(next, '_promote', this.jid);
    }

    /**
     * Hand the primary role from `port` to the freshest other port, if any.
     * @param port - The current primary.
     * @param minLastSeen - Only consider candidates seen at or after this
     *     timestamp (so a failover never picks an equally-dead port).
     * @returns true if a failover happened.
     */
    private _failover(port: MessagePort, minLastSeen = 0): boolean {
        const next = this._freshestPort(port, minLastSeen);
        if (!next) return false;
        this.ports.get(port).role = 'secondary';
        this._post(port, '_role', 'secondary', this.jid);
        this.ports.get(next).role = 'primary';
        this._post(next, '_promote', this.jid);
        return true;
    }

    /**
     * @param exclude - A port to skip.
     * @param minLastSeen - Minimum lastSeen for a port to qualify.
     * @returns The most recently seen qualifying port, or null.
     */
    private _freshestPort(exclude?: MessagePort, minLastSeen = 0): MessagePort | null {
        let best: MessagePort | null = null;
        let bestSeen = minLastSeen - 1;
        for (const [port, info] of this.ports) {
            if (port !== exclude && info.lastSeen > bestSeen) {
                best = port;
                bestSeen = info.lastSeen;
            }
        }
        return best;
    }

    /**
     * A frame was sent into a dead socket. If an SM session was active, feed
     * a stanza to the engine anyway: it lands in the unacked queue and is
     * replayed when the session is resumed over the next socket, so the
     * message the user just sent isn't lost to the bad timing. A <close/>
     * still ends the session: the final <a/> can't be delivered anymore
     * (the engine's sendRaw is null-guarded), but the persisted state is
     * cleared so the deliberately-ended session isn't resumed later.
     * @param port - The port the frame came from.
     * @param data - The raw outbound frame.
     */
    private _salvageFrame(port: MessagePort, data: string): void {
        if (!this.sm) return;
        const view = peekElement(data);
        if (view?.name === 'close') {
            this.sm.onGracefulClose();
        } else if (view) {
            this.sm.trackOutbound(view);
            if (this.sm.isTracking()) {
                // The stanza sits in the queue and will be replayed on the
                // next resume, so reflect it like any sent stanza.
                this._reflect(port, view.name, data);
            }
        } else {
            this._warnUnpeekable('outbound', data);
        }
    }

    /**
     * Report a frame the regex peeker (see parse.ts) could not parse while an
     * SM session was active. Such a frame passes through uncounted and
     * untracked, so the XEP-0198 handled-stanza counters drift and stanzas
     * get duplicated (inbound) or lost (outbound) on the next resume —
     * exactly the silent corruption SM exists to prevent, so make it loud.
     *
     * Only frames that look like an element open are reported: the stream
     * prolog, whitespace keepalives and empty frames legitimately don't peek
     * and are never countable stanzas.
     *
     * The opening tag is included so the peeker can actually be fixed — it is
     * where the parse failed (peekElement only ever inspects the opening tag)
     * and is the whole diagnostic. The report stops at the first '>' (capped),
     * which keeps the stanza payload — message bodies and the like — out of
     * the logs.
     * @param direction
     * @param frame
     */
    private _warnUnpeekable(direction: 'inbound' | 'outbound', frame: string): void {
        if (!/^\s*<[a-zA-Z]/.test(frame)) {
            return;
        }
        const MAX = 200;
        const tagEnd = frame.indexOf('>');
        const openTag = tagEnd !== -1 && tagEnd + 1 <= MAX ? frame.slice(0, tagEnd + 1) : frame.slice(0, MAX) + '…';
        this._broadcast(
            'log',
            'error',
            `StreamManagement: could not parse an ${direction} frame; it was not counted, ` +
                `so the handled-stanza counters may drift. Opening tag: ${openTag}`,
        );
    }

    /**
     * Ping every port and act on prolonged silence. A live page answers
     * pings from its message handler even when its timers are throttled, so:
     * a primary silent past PRIMARY_TIMEOUT is failed over (but keeps
     * receiving — it may merely be frozen and will learn of its demotion on
     * thaw), and a port silent past PORT_GC_TIMEOUT is dropped for good.
     */
    private _sweep(): void {
        const now = Date.now();
        for (const [port, info] of this.ports) {
            if (now - info.lastSeen > PORT_GC_TIMEOUT) {
                this.ports.delete(port);
                if (info.role === 'primary') {
                    this._primaryLost();
                }
                continue;
            }
            this._post(port, '_ping');
            if (info.role === 'primary' && now - info.lastSeen > PRIMARY_TIMEOUT) {
                if (this.session === 'connecting') {
                    this._primaryLost();
                } else {
                    // Only fail over to a port that is provably fresher.
                    this._failover(port, now - PRIMARY_TIMEOUT);
                }
            }
        }
        if (this.ports.size === 0 && this._socketLive()) {
            this._startGrace();
        }
    }

    /**
     * Close the socket if no port shows up within the grace period.
     */
    private _startGrace(): void {
        if (this._graceTimer) return;
        this._graceTimer = setTimeout(() => {
            this._graceTimer = null;
            this._closeSocket();
        }, SOCKET_GRACE);
    }

    private _cancelGrace(): void {
        if (this._graceTimer) {
            clearTimeout(this._graceTimer);
            this._graceTimer = null;
        }
    }

    /**
     * Send a message to a single port (worker→page traffic is port-targeted;
     * only genuine broadcasts use _broadcast).
     * @param port
     * @param msg
     */
    private _post(port: MessagePort, ...msg: unknown[]): void {
        port.postMessage(msg);
    }

    /**
     * Send a message to all live ports.
     * @param msg
     */
    private _broadcast(...msg: unknown[]): void {
        this.ports.forEach((_info, port) => port.postMessage(msg));
    }
}

let manager: ConnectionManager | null = null;

if (typeof addEventListener === 'function') {
    addEventListener('connect', (e: MessageEvent) => {
        manager = manager || new ConnectionManager();
        manager.addPort(e.ports[0]);
    });
}

export default ConnectionManager;
