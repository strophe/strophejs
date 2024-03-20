export default Bosh;
export type Connection = import("./connection.js").default;
/**
 * _Private_ helper class that handles BOSH Connections
 * The Bosh class is used internally by Connection
 * to encapsulate BOSH sessions. It is not meant to be used from user's code.
 */
declare class Bosh {
    /**
     * @param {number} m
     */
    static setTimeoutMultiplier(m: number): void;
    /**
     * @returns {number}
     */
    static getTimeoutMultplier(): number;
    /**
     * @param {number} m
     */
    static setSecondaryTimeoutMultiplier(m: number): void;
    /**
     * @returns {number}
     */
    static getSecondaryTimeoutMultplier(): number;
    /**
     * Returns the HTTP status code from a {@link Request}
     * @private
     * @param {Request} req - The {@link Request} instance.
     * @param {number} [def] - The default value that should be returned if no status value was found.
     */
    private static _getRequestStatus;
    /**
     * @param {Connection} connection - The Connection that will use BOSH.
     */
    constructor(connection: Connection);
    _conn: import("./connection.js").default;
    rid: number;
    sid: string;
    hold: number;
    wait: number;
    window: number;
    errors: number;
    inactivity: number;
    /**
     * BOSH-Connections will have all stanzas wrapped in a <body> tag when
     * passed to {@link Connection#xmlInput|xmlInput()} or {@link Connection#xmlOutput|xmlOutput()}.
     * To strip this tag, User code can set {@link Bosh#strip|strip} to `true`:
     *
     * > // You can set `strip` on the prototype
     * > Bosh.prototype.strip = true;
     *
     * > // Or you can set it on the Bosh instance (which is `._proto` on the connection instance.
     * > const conn = new Connection();
     * > conn._proto.strip = true;
     *
     * This will enable stripping of the body tag in both
     * {@link Connection#xmlInput|xmlInput} and {@link Connection#xmlOutput|xmlOutput}.
     *
     * @property {boolean} [strip=false]
     */
    strip: boolean;
    lastResponseHeaders: string;
    /** @type {Request[]} */
    _requests: Request[];
    /**
     * _Private_ helper function to generate the <body/> wrapper for BOSH.
     * @private
     * @return {Builder} - A Builder with a <body/> element.
     */
    private _buildBody;
    /**
     * Reset the connection.
     * This function is called by the reset function of the Connection
     */
    _reset(): void;
    /**
     * _Private_ function that initializes the BOSH connection.
     * Creates and sends the Request that initializes the BOSH connection.
     * @param {number} wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     *     Other settings will require tweaks to the Strophe.TIMEOUT value.
     * @param {number} hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {string} route
     */
    _connect(wait: number, hold: number, route: string): void;
    /**
     * Attach to an already created and authenticated BOSH session.
     *
     * This function is provided to allow Strophe to attach to BOSH
     * sessions which have been created externally, perhaps by a Web
     * application.  This is often used to support auto-login type features
     * without putting user credentials into the page.
     *
     * @param {string} jid - The full JID that is bound by the session.
     * @param {string} sid - The SID of the BOSH session.
     * @param {number} rid - The current RID of the BOSH session.  This RID
     *     will be used by the next request.
     * @param {Function} callback The connect callback function.
     * @param {number} wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     *     Other settings will require tweaks to the Strophe.TIMEOUT value.
     * @param {number} hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {number} wind - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    _attach(jid: string, sid: string, rid: number, callback: Function, wait: number, hold: number, wind: number): void;
    /**
     * Attempt to restore a cached BOSH session
     *
     * @param {string} jid - The full JID that is bound by the session.
     *     This parameter is optional but recommended, specifically in cases
     *     where prebinded BOSH sessions are used where it's important to know
     *     that the right session is being restored.
     * @param {Function} callback The connect callback function.
     * @param {number} wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     *     Other settings will require tweaks to the Strophe.TIMEOUT value.
     * @param {number} hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {number} wind - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    _restore(jid: string, callback: Function, wait: number, hold: number, wind: number): void;
    /**
     * _Private_ handler for the beforeunload event.
     * This handler is used to process the Bosh-part of the initial request.
     * @private
     */
    private _cacheSession;
    /**
     * _Private_ handler for initial connection request.
     * This handler is used to process the Bosh-part of the initial request.
     * @param {Element} bodyWrap - The received stanza.
     */
    _connect_cb(bodyWrap: Element): number;
    /**
     * _Private_ part of Connection.disconnect for Bosh
     * @param {Element|Builder} pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres: Element | Builder): void;
    /**
     * _Private_ function to disconnect.
     * Resets the SID and RID.
     */
    _doDisconnect(): void;
    /**
     * _Private_ function to check if the Request queue is empty.
     * @return {boolean} - True, if there are no Requests queued, False otherwise.
     */
    _emptyQueue(): boolean;
    /**
     * _Private_ function to call error handlers registered for HTTP errors.
     * @private
     * @param {Request} req - The request that is changing readyState.
     */
    private _callProtocolErrorHandlers;
    /**
     * _Private_ function to handle the error count.
     *
     * Requests are resent automatically until their error count reaches
     * 5.  Each time an error is encountered, this function is called to
     * increment the count and disconnect if the count is too high.
     * @private
     * @param {number} reqStatus - The request status.
     */
    private _hitError;
    /**
     * @callback connectionCallback
     * @param {Connection} connection
     */
    /**
     * Called on stream start/restart when no stream:features
     * has been received and sends a blank poll request.
     * @param {connectionCallback} callback
     */
    _no_auth_received(callback: (connection: Connection) => any): void;
    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     * Cancels all remaining Requests and clears the queue.
     */
    _onDisconnectTimeout(): void;
    /**
     * _Private_ helper function that makes sure all pending requests are aborted.
     */
    _abortAllRequests(): void;
    /**
     * _Private_ handler called by {@link Connection#_onIdle|Connection._onIdle()}.
     * Sends all queued Requests or polls with empty Request if there are none.
     */
    _onIdle(): void;
    /**
     * _Private_ handler for {@link Request} state changes.
     *
     * This function is called when the XMLHttpRequest readyState changes.
     * It contains a lot of error handling logic for the many ways that
     * requests can fail, and calls the request callback when requests
     * succeed.
     * @private
     *
     * @param {Function} func - The handler for the request.
     * @param {Request} req - The request that is changing readyState.
     */
    private _onRequestStateChange;
    /**
     * _Private_ function to process a request in the queue.
     *
     * This function takes requests off the queue and sends them and
     * restarts dead requests.
     * @private
     *
     * @param {number} i - The index of the request in the queue.
     */
    private _processRequest;
    /**
     * _Private_ function to remove a request from the queue.
     * @private
     * @param {Request} req - The request to remove.
     */
    private _removeRequest;
    /**
     * _Private_ function to restart a request that is presumed dead.
     * @private
     *
     * @param {number} i - The index of the request in the queue.
     */
    private _restartRequest;
    /**
     * _Private_ function to get a stanza out of a request.
     * Tries to extract a stanza out of a Request Object.
     * When this fails the current connection will be disconnected.
     *
     * @param {Request} req - The Request.
     * @return {Element} - The stanza that was passed.
     */
    _reqToData(req: Request): Element;
    /**
     * _Private_ function to send initial disconnect sequence.
     *
     * This is the first step in a graceful disconnect.  It sends
     * the BOSH server a terminate body and includes an unavailable
     * presence if authentication has completed.
     * @private
     * @param {Element|Builder} [pres]
     */
    private _sendTerminate;
    /**
     * _Private_ part of the Connection.send function for BOSH
     * Just triggers the RequestHandler to send the messages that are in the queue
     */
    _send(): void;
    /**
     * Send an xmpp:restart stanza.
     */
    _sendRestart(): void;
    /**
     * _Private_ function to throttle requests to the connection window.
     *
     * This function makes sure we don't send requests so fast that the
     * request ids overflow the connection window in the case that one
     * request died.
     * @private
     */
    private _throttledRequestHandler;
}
import Request from './request.js';
import Builder from './builder.js';
//# sourceMappingURL=bosh.d.ts.map