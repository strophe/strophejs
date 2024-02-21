/** @type {ConnectionManager} */
declare let manager: ConnectionManager;
declare namespace Status {
    let ERROR: number;
    let CONNECTING: number;
    let CONNFAIL: number;
    let AUTHENTICATING: number;
    let AUTHFAIL: number;
    let CONNECTED: number;
    let DISCONNECTED: number;
    let DISCONNECTING: number;
    let ATTACHED: number;
    let REDIRECT: number;
    let CONNTIMEOUT: number;
    let BINDREQUIRED: number;
    let ATTACHFAIL: number;
}
/** Class: ConnectionManager
 *
 * Manages the shared websocket connection as well as the ports of the
 * connected tabs.
 */
declare class ConnectionManager {
    /** @type {MessagePort[]} */
    ports: MessagePort[];
    /** @param {MessagePort} port */
    addPort(port: MessagePort): void;
    /**
     * @param {[string, string]} data
     */
    _connect(data: [string, string]): void;
    jid: string;
    socket: WebSocket;
    _attach(): void;
    /** @param {string} str */
    send(str: string): void;
    /** @param {string} str */
    close(str: string): void;
    _onOpen(): void;
    /** @param {CloseEvent} e */
    _onClose(e: CloseEvent): void;
    /** @param {MessageEvent} message */
    _onMessage(message: MessageEvent): void;
    /** @param {Event} error */
    _onError(error: Event): void;
    _closeSocket(): void;
}
//# sourceMappingURL=shared-connection-worker.d.ts.map