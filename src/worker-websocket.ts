import type Connection from './connection';
import Websocket from './websocket';
import log from './log';
import Builder, { $build } from './builder';
import { LOG_LEVELS, NS, Status } from './constants';
import { WebsocketLike } from 'types';

/**
 * Helper class that handles a websocket connection inside a shared worker.
 */
class WorkerWebsocket extends Websocket {
    worker: SharedWorker;
    _messageHandler: (m: MessageEvent) => void;
    socket: WebsocketLike | null;

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
        this.worker.port.postMessage(['_connect', this._conn.service, this._conn.jid]);
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
        this.worker.port.postMessage(['_attach', this._conn.service]);
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
