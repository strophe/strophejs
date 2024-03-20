export default WorkerWebsocket;
/**
 * Helper class that handles a websocket connection inside a shared worker.
 */
declare class WorkerWebsocket extends Websocket {
    worker: SharedWorker;
    /**
     * @private
     */
    private _setSocket;
    /** @param {MessageEvent} m */
    _messageHandler: ((m: MessageEvent) => void) | ((m: MessageEvent) => void) | ((m: MessageEvent) => void);
    /**
     * @param {Function} callback
     */
    _attach(callback: Function): void;
    /**
     * @param {number} status
     * @param {string} jid
     */
    _attachCallback(status: number, jid: string): void;
    /**
     * @param {Element|Builder} pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres: Element | Builder): void;
    /**
     * function that handles messages received from the service worker
     * @private
     * @param {MessageEvent} ev
     */
    private _onWorkerMessage;
}
import Websocket from './websocket.js';
import Builder from './builder.js';
//# sourceMappingURL=worker-websocket.d.ts.map