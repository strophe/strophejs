/**
 * @license MIT
 * @copyright JC Brand
 *
 * @typedef {import("./connection.js").default} Connection
 * @typedef {import("./builder.js").default} Builder
 */

import Websocket from './websocket.js';
import { $build } from './builder.js';
import Strophe from './core.js';

/**
 * Helper class that handles a websocket connection inside a shared worker.
 */
class WorkerWebsocket extends Websocket {
    /**
     * Create and initialize a Strophe.WorkerWebsocket object.
     * @param {Connection} connection - The Strophe.Connection
     */
    constructor(connection) {
        super(connection);
        this._conn = connection;
        this.worker = new SharedWorker(this._conn.options.worker, 'Strophe XMPP Connection');
        this.worker.onerror = (e) => {
            console?.error(e);
            Strophe.log(Strophe.LogLevel.ERROR, `Shared Worker Error: ${e}`);
        };
    }

    /**
     * @private
     */
    _setSocket() {
        this.socket = {
            /** @param {string} str */
            send: (str) => this.worker.port.postMessage(['send', str]),
            close: () => this.worker.port.postMessage(['_closeSocket']),
            onopen: () => {},
            /** @param {ErrorEvent} e */
            onerror: (e) => this._onError(e),
            /** @param {CloseEvent} e */
            onclose: (e) => this._onClose(e),
            onmessage: () => {},
            readyState: null,
        };
    }

    _connect() {
        this._setSocket();
        /** @param {MessageEvent} m */
        this._messageHandler = (m) => this._onInitialMessage(m);
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_connect', this._conn.service, this._conn.jid]);
    }

    /**
     * @param {Function} callback
     */
    _attach(callback) {
        this._setSocket();
        /** @param {MessageEvent} m */
        this._messageHandler = (m) => this._onMessage(m);
        this._conn.connect_callback = callback;
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_attach', this._conn.service]);
    }

    /**
     * @param {number} status
     * @param {string} jid
     */
    _attachCallback(status, jid) {
        if (status === Strophe.Status.ATTACHED) {
            this._conn.jid = jid;
            this._conn.authenticated = true;
            this._conn.connected = true;
            this._conn.restored = true;
            this._conn._changeConnectStatus(Strophe.Status.ATTACHED);
        } else if (status === Strophe.Status.ATTACHFAIL) {
            this._conn.authenticated = false;
            this._conn.connected = false;
            this._conn.restored = false;
            this._conn._changeConnectStatus(Strophe.Status.ATTACHFAIL);
        }
    }

    /**
     * @param {Element|Builder} pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres) {
        pres && this._conn.send(pres);
        const close = $build('close', { 'xmlns': Strophe.NS.FRAMING });
        this._conn.xmlOutput(close.tree());
        const closeString = Strophe.serialize(close);
        this._conn.rawOutput(closeString);
        this.worker.port.postMessage(['send', closeString]);
        this._conn._doDisconnect();
    }

    _closeSocket() {
        this.socket.close();
    }

    /**
     * Called by _onInitialMessage in order to replace itself with the general message handler.
     * This method is overridden by WorkerWebsocket, which manages a
     * websocket connection via a service worker and doesn't have direct access
     * to the socket.
     */
    _replaceMessageHandler() {
        /** @param {MessageEvent} m */
        this._messageHandler = (m) => this._onMessage(m);
    }

    /**
     * function that handles messages received from the service worker
     * @private
     * @param {MessageEvent} ev
     */
    _onWorkerMessage(ev) {
        /** @type {Object.<string, number>} */
        const lmap = {};
        lmap['debug'] = Strophe.LogLevel.DEBUG;
        lmap['info'] = Strophe.LogLevel.INFO;
        lmap['warn'] = Strophe.LogLevel.WARN;
        lmap['error'] = Strophe.LogLevel.ERROR;
        lmap['fatal'] = Strophe.LogLevel.FATAL;

        const { data } = ev;
        const method_name = data[0];
        if (method_name === '_onMessage') {
            this._messageHandler(data[1]);
        } else if (method_name in this) {
            try {
                this[
                    /** @type {'_attachCallback'|'_onOpen'|'_onClose'|'_onError'} */
                    (method_name)
                ].apply(this, ev.data.slice(1));
            } catch (e) {
                Strophe.log(Strophe.LogLevel.ERROR, e);
            }
        } else if (method_name === 'log') {
            const level = data[1];
            const msg = data[2];
            Strophe.log(lmap[level], msg);
        } else {
            Strophe.log(Strophe.LogLevel.ERROR, `Found unhandled service worker message: ${data}`);
        }
    }
}

export default WorkerWebsocket;
