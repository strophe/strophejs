export default Websocket;
export type Connection = import("./connection.js").default;
/**
 * Helper class that handles WebSocket Connections
 *
 * The WebSocket class is used internally by Connection
 * to encapsulate WebSocket sessions. It is not meant to be used from user's code.
 */
declare class Websocket {
    /**
     * Create and initialize a WebSocket object.
     * Currently only sets the connection Object.
     * @param {Connection} connection - The Connection that will use WebSockets.
     */
    constructor(connection: Connection);
    _conn: import("./connection.js").default;
    strip: string;
    /**
     * _Private_ helper function to generate the <stream> start tag for WebSockets
     * @private
     * @return {Builder} - A Builder with a <stream> element.
     */
    private _buildStream;
    /**
     * _Private_ checks a message for stream:error
     * @private
     * @param {Element} bodyWrap - The received stanza.
     * @param {number} connectstatus - The ConnectStatus that will be set on error.
     * @return {boolean} - true if there was a streamerror, false otherwise.
     */
    private _checkStreamError;
    /**
     * Reset the connection.
     *
     * This function is called by the reset function of the Strophe Connection.
     * Is not needed by WebSockets.
     */
    _reset(): void;
    /**
     * _Private_ function called by Connection.connect
     *
     * Creates a WebSocket for a connection and assigns Callbacks to it.
     * Does nothing if there already is a WebSocket.
     */
    _connect(): void;
    /**
     * @typedef {Object} WebsocketLike
     * @property {(str: string) => void} WebsocketLike.send
     * @property {function(): void} WebsocketLike.close
     * @property {function(): void} WebsocketLike.onopen
     * @property {(e: ErrorEvent) => void} WebsocketLike.onerror
     * @property {(e: CloseEvent) => void} WebsocketLike.onclose
     * @property {(message: MessageEvent) => void} WebsocketLike.onmessage
     * @property {string} WebsocketLike.readyState
     */
    /** @type {import('ws')|WebSocket|WebsocketLike} */
    socket: import("ws") | WebSocket | {
        send: (str: string) => void;
        close: () => void;
        onopen: () => void;
        onerror: (e: ErrorEvent) => void;
        onclose: (e: CloseEvent) => void;
        onmessage: (message: MessageEvent) => void;
        readyState: string;
    };
    /**
     * _Private_ function called by Connection._connect_cb
     * checks for stream:error
     * @param {Element} bodyWrap - The received stanza.
     */
    _connect_cb(bodyWrap: Element): number;
    /**
     * _Private_ function that checks the opening <open /> tag for errors.
     *
     * Disconnects if there is an error and returns false, true otherwise.
     * @private
     * @param {Element} message - Stanza containing the <open /> tag.
     */
    private _handleStreamStart;
    /**
     * _Private_ function that handles the first connection messages.
     *
     * On receiving an opening stream tag this callback replaces itself with the real
     * message handler. On receiving a stream error the connection is terminated.
     * @param {MessageEvent} message
     */
    _onInitialMessage(message: MessageEvent): void;
    /**
     * Called by _onInitialMessage in order to replace itself with the general message handler.
     * This method is overridden by WorkerWebsocket, which manages a
     * websocket connection via a service worker and doesn't have direct access
     * to the socket.
     */
    _replaceMessageHandler(): void;
    /**
     * _Private_ function called by Connection.disconnect
     * Disconnects and sends a last stanza if one is given
     * @param {Element|Builder} [pres] - This stanza will be sent before disconnecting.
     */
    _disconnect(pres?: Element | Builder): void;
    /**
     * _Private_ function to disconnect.
     * Just closes the Socket for WebSockets
     */
    _doDisconnect(): void;
    /**
     * PrivateFunction _streamWrap
     * _Private_ helper function to wrap a stanza in a <stream> tag.
     * This is used so Strophe can process stanzas from WebSockets like BOSH
     * @param {string} stanza
     */
    _streamWrap(stanza: string): string;
    /**
     * _Private_ function to close the WebSocket.
     *
     * Closes the socket if it is still open and deletes it
     */
    _closeSocket(): void;
    /**
     * _Private_ function to check if the message queue is empty.
     * @return {true} - True, because WebSocket messages are send immediately after queueing.
     */
    _emptyQueue(): true;
    /**
     * _Private_ function to handle websockets closing.
     * @param {CloseEvent} [e]
     */
    _onClose(e?: CloseEvent): void;
    /**
     * @callback connectionCallback
     * @param {Connection} connection
     */
    /**
     * Called on stream start/restart when no stream:features
     * has been received.
     * @param {connectionCallback} callback
     */
    _no_auth_received(callback: (connection: Connection) => any): void;
    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     *
     * This does nothing for WebSockets
     */
    _onDisconnectTimeout(): void;
    /**
     * _Private_ helper function that makes sure all pending requests are aborted.
     */
    _abortAllRequests(): void;
    /**
     * _Private_ function to handle websockets errors.
     * @param {Object} error - The websocket error.
     */
    _onError(error: Object): void;
    /**
     * _Private_ function called by Connection._onIdle
     * sends all queued stanzas
     */
    _onIdle(): void;
    /**
     * _Private_ function to handle websockets messages.
     *
     * This function parses each of the messages as if they are full documents.
     * [TODO : We may actually want to use a SAX Push parser].
     *
     * Since all XMPP traffic starts with
     * <stream:stream version='1.0'
     *                xml:lang='en'
     *                xmlns='jabber:client'
     *                xmlns:stream='http://etherx.jabber.org/streams'
     *                id='3697395463'
     *                from='SERVER'>
     *
     * The first stanza will always fail to be parsed.
     *
     * Additionally, the seconds stanza will always be <stream:features> with
     * the stream NS defined in the previous stanza, so we need to 'force'
     * the inclusion of the NS in this stanza.
     *
     * @param {MessageEvent} message - The websocket message event
     */
    _onMessage(message: MessageEvent): void;
    /**
     * _Private_ function to handle websockets connection setup.
     * The opening stream tag is sent here.
     * @private
     */
    private _onOpen;
    /**
     * _Private_ part of the Connection.send function for WebSocket
     * Just flushes the messages that are in the queue
     */
    _send(): void;
    /**
     * Send an xmpp:restart stanza.
     */
    _sendRestart(): void;
}
import Builder from './builder.js';
//# sourceMappingURL=websocket.d.ts.map