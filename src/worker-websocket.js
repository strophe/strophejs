/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2020, JC Brand
*/

import './websocket.js';
import { $build, Strophe } from './core.js';

const lmap = {};
lmap['debug'] = Strophe.LogLevel.DEBUG;
lmap['info'] = Strophe.LogLevel.INFO;
lmap['warn'] = Strophe.LogLevel.WARN;
lmap['error'] = Strophe.LogLevel.ERROR;
lmap['fatal'] = Strophe.LogLevel.FATAL;


/** Class: Strophe.WorkerWebsocket
 *  _Private_ helper class that handles a websocket connection inside a shared worker.
 */
Strophe.WorkerWebsocket = class WorkerWebsocket extends Strophe.Websocket {

    /** PrivateConstructor: Strophe.WorkerWebsocket
     *  Create and initialize a Strophe.WorkerWebsocket object.
     *
     *  Parameters:
     *    (Strophe.Connection) connection - The Strophe.Connection
     *
     *  Returns:
     *    A new Strophe.WorkerWebsocket object.
     */
    constructor (connection) {
        super(connection);
        this._conn = connection;
        this.worker = new SharedWorker(this._conn.options.worker, 'Strophe XMPP Connection');
        this.worker.onerror = (e) => {
            console?.error(e);
            Strophe.log(Strophe.LogLevel.ERROR, `Shared Worker Error: ${e}`);
        }
    }

    get socket () {
        return {
            'send': str => this.worker.port.postMessage(['send', str])
        }
    }

    _connect () {
        this._messageHandler = (m) => this._onInitialMessage(m);
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_connect', this._conn.service, this._conn.jid]);
    }

    _attach (callback) {
        this._messageHandler = (m) => this._onMessage(m);
        this._conn.connect_callback = callback;
        this.worker.port.start();
        this.worker.port.onmessage = (ev) => this._onWorkerMessage(ev);
        this.worker.port.postMessage(['_attach', this._conn.service]);
    }

    _attachCallback (status, jid) {
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

    _disconnect (readyState, pres) {
        pres && this._conn.send(pres);
        const close = $build("close", { "xmlns": Strophe.NS.FRAMING });
        this._conn.xmlOutput(close.tree());
        const closeString = Strophe.serialize(close);
        this._conn.rawOutput(closeString);
        this.worker.port.postMessage(['send', closeString]);
        this._conn._doDisconnect();
    }

    _onClose (e) {
        if (this._conn.connected && !this._conn.disconnecting) {
            Strophe.error("Websocket closed unexpectedly");
            this._conn._doDisconnect();
        } else if (e && e.code === 1006 && !this._conn.connected) {
            // in case the onError callback was not called (Safari 10 does not
            // call onerror when the initial connection fails) we need to
            // dispatch a CONNFAIL status update to be consistent with the
            // behavior on other browsers.
            Strophe.error("Websocket closed unexcectedly");
            this._conn._changeConnectStatus(
                Strophe.Status.CONNFAIL,
                "The WebSocket connection could not be established or was disconnected."
            );
            this._conn._doDisconnect();
        } else {
            Strophe.debug("Websocket closed");
        }
    }

    _closeSocket () {
        this.worker.port.postMessage(['_closeSocket']);
    }

    /** PrivateFunction: _replaceMessageHandler
     *
     * Called by _onInitialMessage in order to replace itself with the general message handler.
     * This method is overridden by Strophe.WorkerWebsocket, which manages a
     * websocket connection via a service worker and doesn't have direct access
     * to the socket.
     */
    _replaceMessageHandler () {
        this._messageHandler = (m) => this._onMessage(m);
    }

    /** PrivateFunction: _onWorkerMessage
     * _Private_ function that handles messages received from the service worker
     */
    _onWorkerMessage (ev) {
        const { data } = ev;
        const method_name = data[0];
        if (method_name === '_onMessage') {
            this._messageHandler(data[1]);
        } else if (method_name in this) {
            try {
                this[method_name].apply(this, ev.data.slice(1));
            } catch (e) {
                Strophe.log(Strophe.LogLevel.ERROR, e);
            }
        } else if (method_name === 'log') {
            const level = data[1];
            const msg = data[2]
            Strophe.log(lmap[level], msg);
        } else {
            Strophe.log(
                Strophe.LogLevel.ERROR,
                `Found unhandled service worker message: ${data}`
            );
        }
    }
}
