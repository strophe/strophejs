/**
 * XEP-0198 Stream Management — the engine.
 *
 * This class holds all SM state and logic (counters, the unacked queue, the
 * enable/resume lifecycle) and never touches a DOM Element or a raw websocket
 * frame, so the same class can be hosted by a page-side Connection or inside a
 * SharedWorker. Everything it needs from a stanza is captured in a minimal
 * {@link StanzaView}, produced by whichever side hosts it. Nonzas are emitted
 * as strings through the injected `sendRaw` function.
 *
 * IMPORTANT: this module must be loadable in a SharedWorker global (it is
 * bundled into dist/shared-connection-worker.js), so keep it free of imports
 * beyond log/constants and its worker-safe siblings — in particular no
 * ../utils.ts or ../builder.ts, and no module-level DOM access.
 */
import log from '../log';
import { NS } from '../constants';
import { QueuedStanza, SMState, SMStorageBackend, StanzaView, StreamManagementOptions } from './types';
import { H_WRAP, freshState, isCountableStanza, parseH, stampDelay, xmlEscape } from './utils';
import { MemoryStorageBackend } from './storage';

/** SM nonza names in the urn:xmpp:sm:3 namespace. */
const NONZAS = ['r', 'a', 'enabled', 'resumed', 'failed'];

/**
 * The XEP-0198 Stream Management engine.
 *
 * Hosted by {@link Connection} (page) or by the shared-connection worker; fed
 * {@link StanzaView}s by a thin per-environment adapter. Emits nonzas through
 * the injected `sendRaw` function — on the page that appends to the
 * connection's send queue (never a direct socket write, to preserve stanza
 * ordering), in the worker it writes to the socket.
 */
class StreamManagement {
    /** Whether the current stream's features advertised <sm xmlns="urn:xmpp:sm:3"/>. Not persisted. */
    serverSupported: boolean;

    private _sendRaw: (data: string) => void;
    private _options: StreamManagementOptions;
    private _storage: SMStorageBackend;
    private _storageKey: string;
    private _state: SMState;
    /**
     * Whether a <resume/> has been sent and not yet answered. Deliberately
     * not part of the persisted state: it describes the current stream's
     * negotiation, not the resumable session, so a reloaded page must not
     * inherit it.
     */
    private _resumePending: boolean;
    /**
     * Stanzas salvaged from a failed resumption, awaiting re-send once the
     * fresh session reaches <enabled/>. Deliberately not persisted: storage is
     * cleared on <failed/>, and this buffer is best-effort redelivery.
     */
    private _pendingResend: QueuedStanza[];

    /**
     * @param sendRaw - Emits a serialized nonza (or re-sent stanza) towards the server.
     * @param options
     */
    constructor(sendRaw: (data: string) => void, options: StreamManagementOptions = {}) {
        this._sendRaw = sendRaw;
        this._options = {
            maxUnacked: 5,
            requestResume: true,
            ...options,
        };
        this._storage = this._options.storage || new MemoryStorageBackend();
        this._storageKey = null;
        this._state = freshState();
        this._resumePending = false;
        this._pendingResend = [];
        this.serverSupported = false;
    }

    /** The live SM state. Treat as read-only outside of tests. */
    get state(): SMState {
        return this._state;
    }

    /** Whether <enabled/> has been received and the SM session is active. */
    get enabled(): boolean {
        return this._state.enabled;
    }

    /** Whether the current session was established by resumption. */
    get resumed(): boolean {
        return this._state.resumed;
    }

    /** The full JID bound when the SM session was enabled. */
    get boundJid(): string {
        return this._state.boundJid;
    }

    /** Whether a <resume/> has been sent and not yet answered. */
    get resumePending(): boolean {
        return this._resumePending;
    }

    /**
     * Set the storage key (from the user's bare JID) and load any persisted
     * resumable state. Call before deciding between resume and fresh bind.
     * @param jid - The user's JID (a full JID is reduced to its bare form).
     */
    initialize(jid: string): void {
        this._storageKey = `strophe-sm:${jid.split('/')[0].toLowerCase()}`;
        const stored = this._storage.load(this._storageKey);
        if (stored) {
            this._state = { ...freshState(), ...stored };
        }
    }

    /**
     * @returns true if persisted state allows attempting <resume/>.
     */
    hasResumableState(): boolean {
        return !!(this._state.id && this._state.resumeSupported);
    }

    /**
     * Reset the in-memory engine (e.g. from Connection.reset()).
     * Persisted state is NOT touched — clearing storage is tied to intent
     * (clean close, logout, failed resume), not to connection reuse.
     */
    reset(): void {
        this._state = freshState();
        this._resumePending = false;
        this._pendingResend = [];
        this.serverSupported = false;
    }

    /** Remove persisted state (clean close, logout, failed resume). */
    clearPersistedState(): void {
        if (this._storageKey) {
            this._storage.clear(this._storageKey);
        }
    }

    /**
     * Send <enable/> to start a new SM session. Call after resource binding,
     * at the point CONNECTED is emitted. At most one <enable/> is sent per
     * stream — a second attempt SHOULD get the stream killed by the server
     * (XEP-0198 §3).
     * @param boundJid - The full JID that was just bound.
     */
    sendEnable(boundJid: string): void {
        const s = this._state;
        if (s.enableSent) {
            log.warn('StreamManagement.sendEnable called but <enable/> was already sent for this session');
            return;
        }
        s.enableSent = true;
        s.enabled = false;
        s.resumed = false;
        s.id = null;
        s.max = null;
        s.location = null;
        s.resumeSupported = false;
        s.hIn = 0;
        s.hOutAcked = 0;
        s.sinceLastAck = 0;
        s.unacked = [];
        s.boundJid = boundJid;
        const resume = this._options.requestResume ? ' resume="true"' : '';
        const max = this._options.max ? ` max="${this._options.max}"` : '';
        this._sendRaw(`<enable xmlns="${NS.SM}"${resume}${max}/>`);
        this._persist();
    }

    /**
     * Send <resume/> for the persisted previous session. Call instead of
     * binding, once the post-SASL stream features advertise SM support.
     */
    sendResume(): void {
        const s = this._state;
        if (!this.hasResumableState()) {
            log.warn('StreamManagement.sendResume called without resumable state');
            return;
        }
        this._resumePending = true;
        this._sendRaw(`<resume xmlns="${NS.SM}" h="${s.hIn}" previd="${xmlEscape(s.id)}"/>`);
    }

    /**
     * Track an outbound top-level element. Called for every element that
     * enters the send queue; non-countable elements are ignored here.
     * Active from the moment <enable/> is sent (not from <enabled/> receipt —
     * XEP-0198 starts the outbound counter at enable-send).
     * @param view
     */
    trackOutbound(view: StanzaView): void {
        const s = this._state;
        if (!s.enableSent || !isCountableStanza(view.name)) {
            return;
        }
        s.unacked.push({ name: view.name, stanza: view.serialized, queuedAt: Date.now() });
        s.sinceLastAck += 1;
        const max = this._options.maxUnacked;
        if (max > 0 && s.sinceLastAck % max === 0) {
            this.requestAck();
        }
        this._persist();
    }

    /**
     * Process an inbound top-level element.
     * @param view
     * @returns true if the element was an SM nonza (consumed by the engine),
     *     false if it's a regular stanza (counted here when the session is
     *     enabled, but still to be dispatched to handlers by the caller).
     */
    onInbound(view: StanzaView): boolean {
        if (isCountableStanza(view.name)) {
            this.onInboundStanza(view.name);
            return false;
        }
        switch (view.name) {
            case 'r':
                if (this._state.enabled) this.sendAck();
                return true;
            case 'a':
                this._handleAck(view);
                return true;
            case 'enabled':
                this._handleEnabled(view);
                return true;
            case 'resumed':
                this._handleResumed(view);
                return true;
            case 'failed':
                this._handleFailed(view);
                return true;
            default:
                return false;
        }
    }

    /**
     * @param name - A top-level element's local tag name.
     * @returns true if the element is an SM nonza.
     */
    isNonza(name: string): boolean {
        return NONZAS.includes(name);
    }

    /** Send an unrequested ack request <r/> to the server. */
    requestAck(): void {
        this._sendRaw(`<r xmlns="${NS.SM}"/>`);
    }

    /**
     * Send an ack <a/> with the current inbound count. Used to answer <r/>,
     * and RECOMMENDED right before gracefully closing the stream (XEP-0198 §4)
     * so the server doesn't redeliver stanzas that were actually received.
     */
    sendAck(): void {
        this._sendRaw(`<a xmlns="${NS.SM}" h="${this._state.hIn}"/>`);
    }

    /**
     * Count an inbound top-level stanza by name. Adapters call this from
     * their dispatch loop for every inbound child element — non-countable
     * names and inactive sessions are no-ops, so no StanzaView needs to be
     * built for the common case.
     * @param name - The element's local tag name.
     */
    onInboundStanza(name: string): void {
        if (this._state.enabled && isCountableStanza(name)) {
            this._state.hIn = (this._state.hIn + 1) % H_WRAP;
            this._persist();
        }
    }

    /**
     * Call when the stream is about to be closed cleanly: sends a final
     * <a/> so the server doesn't redeliver stanzas that were actually
     * received (RECOMMENDED, XEP-0198 §4), clears persisted state (a
     * cleanly closed stream is not resumable, XEP-0198 §Stream Closure) and
     * deactivates the engine, so nothing sent during teardown is tracked or
     * re-persisted.
     */
    onGracefulClose(): void {
        if (this._state.enabled) {
            this.sendAck();
        }
        this.clearPersistedState();
        this._state = freshState();
        this._resumePending = false;
        this._pendingResend = [];
    }

    /** Overridable event hook: an SM session was established via <enabled/>. */
    onEnabled(): void {
        return;
    }

    /** Overridable event hook: the previous session was resumed via <resumed/>. */
    onResumed(): void {
        return;
    }

    /**
     * Overridable event hook: <enable/> or <resume/> failed.
     * @param _view - The <failed/> nonza (inspect e.g. for <item-not-found/>).
     * @param _resumeFailed - true when the failure answered a <resume/> (the
     *     unacked queue was salvaged for re-send on the next session), false
     *     when it answered an <enable/>.
     */
    onFailed(_view?: StanzaView, _resumeFailed?: boolean): void {
        return;
    }

    /**
     * Reconcile the server-reported 'h' against the unacked queue (mod 2^32).
     * An 'h' above our send count is logged and clamped rather than answered
     * with the spec's <handled-count-too-high/> stream close — a client
     * killing the stream over a server bug only hurts the user.
     * @param h
     */
    private _reconcile(h: number): void {
        const s = this._state;
        let delta = (h - s.hOutAcked + H_WRAP) % H_WRAP;
        if (delta > s.unacked.length) {
            log.error(
                `StreamManagement: server acked ${delta} stanzas but only ` +
                    `${s.unacked.length} are unacknowledged (h=${h}, previous h=${s.hOutAcked})`,
            );
            delta = s.unacked.length;
        }
        s.unacked = s.unacked.slice(delta);
        s.hOutAcked = h;
    }

    /**
     * @param view
     */
    private _handleAck(view: StanzaView): void {
        const s = this._state;
        if (!s.enableSent && !s.enabled) {
            return;
        }
        const h = parseH(view.attrs.h);
        if (h === null) {
            log.error('StreamManagement: received <a/> without a valid h attribute');
            return;
        }
        this._reconcile(h);
        s.sinceLastAck = 0;
        this._persist();
    }

    /**
     * @param view
     */
    private _handleEnabled(view: StanzaView): void {
        const s = this._state;
        if (!s.enableSent) {
            log.warn('StreamManagement: received <enabled/> but <enable/> was not sent; ignoring');
            return;
        }
        s.enabled = true;
        s.id = view.attrs.id || null;
        const max = parseInt(view.attrs.max, 10);
        s.max = Number.isNaN(max) ? null : max;
        s.location = view.attrs.location || null;
        s.resumeSupported = ['true', '1'].includes(view.attrs.resume);
        this._resendPending();
        this._persist();
        this.onEnabled();
    }

    /**
     * @param view
     */
    private _handleResumed(view: StanzaView): void {
        const s = this._state;
        if (!s.id) {
            log.warn('StreamManagement: received <resumed/> without resumable state; ignoring');
            return;
        }
        this._resumePending = false;
        s.resumed = true;
        s.enabled = true;
        s.enableSent = true;
        const h = parseH(view.attrs.h);
        if (h !== null) {
            this._reconcile(h);
        }
        s.sinceLastAck = 0;
        // Re-send whatever the server didn't acknowledge (a MUST, XEP-0198
        // §5). The entries stay in `unacked` — they're still unacknowledged —
        // and are not re-tracked.
        for (const entry of s.unacked) {
            this._sendRaw(entry.stanza);
        }
        if (s.unacked.length) {
            this.requestAck();
        }
        this._persist();
        this.onResumed();
    }

    /**
     * <enable/> or <resume/> failed. Trim the queue by the optional 'h' on
     * <failed/>, reset the dead session and clear its persisted state.
     *
     * Only a failed *resumption* strands sent-but-undelivered stanzas, so
     * only then is the remaining queue salvaged for re-send once a fresh
     * session reaches <enabled/> (a SHOULD, XEP-0198 §4). When <failed/>
     * answers an <enable/> the stream is alive and bound — everything in
     * `unacked` was delivered normally; re-sending it later would duplicate
     * it.
     * @param view
     */
    private _handleFailed(view: StanzaView): void {
        const s = this._state;
        if (!s.enableSent && !s.id) {
            return;
        }
        const resumeFailed = this._resumePending;
        this._resumePending = false;
        const h = parseH(view.attrs.h);
        if (h !== null) {
            this._reconcile(h);
        }
        if (resumeFailed) {
            this._pendingResend = this._pendingResend.concat(s.unacked);
        }
        this._state = freshState();
        this.clearPersistedState();
        this.onFailed(view, resumeFailed);
    }

    /**
     * Re-send stanzas salvaged from a failed resumption on the freshly
     * enabled session. Messages are stamped with a XEP-0203 <delay/> carrying
     * their original send time. The re-sent stanzas enter the new session's
     * unacked queue in wire order.
     */
    private _resendPending(): void {
        const pending = this._pendingResend;
        if (!pending.length) {
            return;
        }
        this._pendingResend = [];
        const s = this._state;
        for (const entry of pending) {
            const stanza =
                entry.name === 'message' ? stampDelay(entry.stanza, entry.name, entry.queuedAt) : entry.stanza;
            this._sendRaw(stanza);
            s.unacked.push({ ...entry, stanza });
            s.sinceLastAck += 1;
        }
        this.requestAck();
    }

    /** Persist the current state, if a storage key has been configured. */
    private _persist(): void {
        if (this._storageKey) {
            this._storage.save(this._storageKey, this._state);
        }
    }
}

export default StreamManagement;
