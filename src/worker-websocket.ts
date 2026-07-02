import type Connection from './connection';
import Websocket from './websocket';
import log from './log';
import Builder, { $build } from './builder';
import { LOG_LEVELS, NS, SHARED_WORKER_PROTOCOL_VERSION, Status } from './constants';
import { WebsocketLike } from 'types';

/**
 * Helper class that handles a websocket connection inside a shared worker.
 */
class WorkerWebsocket extends Websocket {
    worker: SharedWorker;
    _messageHandler: (m: MessageEvent) => void;
    socket: WebsocketLike | null;
    private _lifecycleAttached: boolean;

    /**
     * Create and initialize a WorkerWebsocket object.
     * @param connection - The Connection
     */
    constructor(connection: Connection) {
        super(connection);
        this._conn = connection;
        this.worker = new SharedWorker(this._conn.options.worker, 'Strophe XMPP Connection');
        this.worker.onerror = (e) => {
            console?.error(e);
            log.error(`Shared Worker Error: ${e}`);
        };
    }

    /**
     * @private
     */
    _setSocket(): void {
        this.socket = {
            send: (str: string) => this.worker.port.postMessage(['send', str]),
            close: () => this.worker.port.postMessage(['_closeSocket']),
            onopen: () => {},
            onerror: (e: Event) => this._onError(e),
            onclose: (e: CloseEvent) => this._onClose(e),
            onmessage: () => {},
            readyState: null,
        };
    }

    _connect(): void {
        this._setSocket();
        this._messageHandler = (m: MessageEvent) => this._onInitialMessage(m);
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_connect', this._conn.service, this._conn.jid, SHARED_WORKER_PROTOCOL_VERSION]);
        this._attachLifecycleListeners();
    }

    /**
     * @param callback
     */
    _attach(callback: (status: number, condition?: string | Element, response?: Element | string) => void): void {
        this._setSocket();
        this._messageHandler = (m: MessageEvent) => this._onMessage(m);
        this._conn.connect_callback = callback;
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_attach', this._conn.service, SHARED_WORKER_PROTOCOL_VERSION]);
        this._attachLifecycleListeners();
    }

    /**
     * Called by the worker to assign this tab's role. A secondary shares the
     * already-established session, so it must not treat inbound frames as its
     * own connection handshake.
     * @param role
     * @param jid - The shared connection's JID.
     */
    _role(role: 'primary' | 'secondary', jid?: string): void {
        this._conn.role = role;
        if (role === 'secondary') {
            this._messageHandler = (m: MessageEvent) => this._onMessage(m);
            if (jid) this._conn.jid = jid;
        }
        this._conn.onRoleChanged(role);
    }

    /**
     * Called by the worker when this tab is promoted to primary after the
     * previous primary went away. Same socket — no reconnect happens.
     * @param jid - The shared connection's JID.
     */
    _promote(jid?: string): void {
        this._conn.role = 'primary';
        if (jid) this._conn.jid = jid;
        this._conn.onRoleChanged('primary');
    }

    /**
     * Liveness probe from the worker. Answered from this message handler —
     * which runs even when the browser throttles this tab's timers — so a
     * merely-backgrounded tab never looks dead to the worker.
     */
    _ping(): void {
        this.worker.port.postMessage(['_pong']);
    }

    /**
     * Wire the page lifecycle into the worker's port bookkeeping: `_bye` on
     * pagehide (graceful removal + failover), `_relinquish` on freeze (hand
     * the primary role over *before* this tab's CPU stops), and a `_pong`
     * when the page comes back (which also re-admits this port if the worker
     * dropped it while we were away). Routine liveness is worker-driven
     * ping/pong (see {@link WorkerWebsocket#_ping}) — deliberately no
     * page-side timers, because hidden tabs may only run timers once every
     * ten minutes.
     */
    private _attachLifecycleListeners(): void {
        if (this._lifecycleAttached || typeof window === 'undefined') {
            return;
        }
        window.addEventListener('pagehide', () => this.worker.port.postMessage(['_bye']));
        window.addEventListener('pageshow', () => this.worker.port.postMessage(['_pong']));
        document.addEventListener('freeze', () => this.worker.port.postMessage(['_relinquish']));
        document.addEventListener('resume', () => this.worker.port.postMessage(['_pong']));
        this._lifecycleAttached = true;
    }

    /**
     * @param status
     * @param jid
     */
    _attachCallback(status: number, jid?: string, _condition?: string): void {
        if (status === Status.ATTACHED) {
            this._conn.jid = jid;
            this._conn.authenticated = true;
            this._conn.connected = true;
            this._conn.restored = true;
            this._conn._changeConnectStatus(Status.ATTACHED);
        } else if (status === Status.ATTACHFAIL) {
            this._conn.authenticated = false;
            this._conn.connected = false;
            this._conn.restored = false;
            this._conn._changeConnectStatus(Status.ATTACHFAIL);
        }
    }

    /**
     * @param pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres?: Element | Builder): void {
        pres && this._conn.send(pres);
        const close = $build('close', { 'xmlns': NS.FRAMING });
        this._conn.xmlOutput(close.tree());
        const closeString = Builder.serialize(close);
        this._conn.rawOutput(closeString);
        this.worker.port.postMessage(['send', closeString]);
        this._conn._doDisconnect();
    }

    _closeSocket(): void {
        this.socket!.close();
    }

    /**
     * Called by _onInitialMessage in order to replace itself with the general message handler.
     * This method is overridden by WorkerWebsocket, which manages a
     * websocket connection via a service worker and doesn't have direct access
     * to the socket.
     */
    _replaceMessageHandler(): void {
        this._messageHandler = (m: MessageEvent) => this._onMessage(m);
    }

    /**
     * function that handles messages received from the service worker
     * @private
     * @param ev
     */
    _onWorkerMessage(ev: MessageEvent): void {
        const { data } = ev;
        const method_name = data[0];
        if (method_name === '_onMessage') {
            this._messageHandler(data[1]);
        } else if (method_name in this) {
            try {
                (this as unknown as Record<string, Function>)[method_name].apply(this, ev.data.slice(1));
            } catch (e) {
                log.error(String(e));
            }
        } else if (method_name === 'log') {
            const lmap: Record<string, number> = {
                debug: LOG_LEVELS.DEBUG,
                info: LOG_LEVELS.INFO,
                warn: LOG_LEVELS.WARN,
                error: LOG_LEVELS.ERROR,
                fatal: LOG_LEVELS.FATAL,
            };
            const level = data[1];
            const msg = data[2];
            log.log(lmap[level], msg);
        } else {
            log.error(`Found unhandled service worker message: ${data}`);
        }
    }
}

export default WorkerWebsocket;
