/**
 * A JavaScript library to enable BOSH in Strophejs.
 *
 * this library uses Bidirectional-streams Over Synchronous HTTP (BOSH)
 * to emulate a persistent, stateful, two-way connection to an XMPP server.
 * More information on BOSH can be found in XEP 124.
 */

/**
 * @typedef {import("./connection.js").default} Connection
 */
import log from './log.js';
import Builder, { $build } from './builder.js';
import Request from './request.js';
import { getBareJidFromJid, getDomainFromJid, getNodeFromJid } from './utils.js';
import { Status, NS } from './constants.js';

let timeoutMultiplier = 1.1;
let secondaryTimeoutMultiplier = 0.1;

/**
 * _Private_ helper class that handles BOSH Connections
 * The Bosh class is used internally by Connection
 * to encapsulate BOSH sessions. It is not meant to be used from user's code.
 */
class Bosh {
    /**
     * @param {Connection} connection - The Connection that will use BOSH.
     */
    constructor(connection) {
        this._conn = connection;
        /* request id for body tags */
        this.rid = Math.floor(Math.random() * 4294967295);
        /* The current session ID. */
        this.sid = null;

        // default BOSH values
        this.hold = 1;
        this.wait = 60;
        this.window = 5;
        this.errors = 0;
        this.inactivity = null;

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
        this.strip = Bosh.prototype.strip ?? false;

        this.lastResponseHeaders = null;
        /** @type {Request[]} */
        this._requests = [];
    }

    /**
     * @param {number} m
     */
    static setTimeoutMultiplier(m) {
        timeoutMultiplier = m;
    }

    /**
     * @returns {number}
     */
    static getTimeoutMultplier() {
        return timeoutMultiplier;
    }

    /**
     * @param {number} m
     */
    static setSecondaryTimeoutMultiplier(m) {
        secondaryTimeoutMultiplier = m;
    }

    /**
     * @returns {number}
     */
    static getSecondaryTimeoutMultplier() {
        return secondaryTimeoutMultiplier;
    }

    /**
     * _Private_ helper function to generate the <body/> wrapper for BOSH.
     * @private
     * @return {Builder} - A Builder with a <body/> element.
     */
    _buildBody() {
        const bodyWrap = $build('body', {
            'rid': this.rid++,
            'xmlns': NS.HTTPBIND,
        });
        if (this.sid !== null) {
            bodyWrap.attrs({ 'sid': this.sid });
        }
        if (this._conn.options.keepalive && this._conn._sessionCachingSupported()) {
            this._cacheSession();
        }
        return bodyWrap;
    }

    /**
     * Reset the connection.
     * This function is called by the reset function of the Connection
     */
    _reset() {
        this.rid = Math.floor(Math.random() * 4294967295);
        this.sid = null;
        this.errors = 0;
        if (this._conn._sessionCachingSupported()) {
            sessionStorage.removeItem('strophe-bosh-session');
        }

        this._conn.nextValidRid(this.rid);
    }

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
    _connect(wait, hold, route) {
        this.wait = wait || this.wait;
        this.hold = hold || this.hold;
        this.errors = 0;

        const body = this._buildBody().attrs({
            'to': this._conn.domain,
            'xml:lang': 'en',
            'wait': this.wait,
            'hold': this.hold,
            'content': 'text/xml; charset=utf-8',
            'ver': '1.6',
            'xmpp:version': '1.0',
            'xmlns:xmpp': NS.BOSH,
        });
        if (route) {
            body.attrs({ route });
        }

        const _connect_cb = this._conn._connect_cb;
        this._requests.push(
            new Request(
                body.tree(),
                this._onRequestStateChange.bind(this, _connect_cb.bind(this._conn)),
                Number(body.tree().getAttribute('rid'))
            )
        );
        this._throttledRequestHandler();
    }

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
    _attach(jid, sid, rid, callback, wait, hold, wind) {
        this._conn.jid = jid;
        this.sid = sid;
        this.rid = rid;

        this._conn.connect_callback = callback;
        this._conn.domain = getDomainFromJid(this._conn.jid);
        this._conn.authenticated = true;
        this._conn.connected = true;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;
        this.window = wind || this.window;

        this._conn._changeConnectStatus(Status.ATTACHED, null);
    }

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
    _restore(jid, callback, wait, hold, wind) {
        const session = JSON.parse(sessionStorage.getItem('strophe-bosh-session'));
        if (
            typeof session !== 'undefined' &&
            session !== null &&
            session.rid &&
            session.sid &&
            session.jid &&
            (typeof jid === 'undefined' ||
                jid === null ||
                getBareJidFromJid(session.jid) === getBareJidFromJid(jid) ||
                // If authcid is null, then it's an anonymous login, so
                // we compare only the domains:
                (getNodeFromJid(jid) === null && getDomainFromJid(session.jid) === jid))
        ) {
            this._conn.restored = true;
            this._attach(session.jid, session.sid, session.rid, callback, wait, hold, wind);
        } else {
            const error = new Error('_restore: no restoreable session.');
            error.name = 'StropheSessionError';
            throw error;
        }
    }

    /**
     * _Private_ handler for the beforeunload event.
     * This handler is used to process the Bosh-part of the initial request.
     * @private
     */
    _cacheSession() {
        if (this._conn.authenticated) {
            if (this._conn.jid && this.rid && this.sid) {
                sessionStorage.setItem(
                    'strophe-bosh-session',
                    JSON.stringify({
                        'jid': this._conn.jid,
                        'rid': this.rid,
                        'sid': this.sid,
                    })
                );
            }
        } else {
            sessionStorage.removeItem('strophe-bosh-session');
        }
    }

    /**
     * _Private_ handler for initial connection request.
     * This handler is used to process the Bosh-part of the initial request.
     * @param {Element} bodyWrap - The received stanza.
     */
    _connect_cb(bodyWrap) {
        const typ = bodyWrap.getAttribute('type');
        if (typ !== null && typ === 'terminate') {
            // an error occurred
            let cond = bodyWrap.getAttribute('condition');
            log.error('BOSH-Connection failed: ' + cond);
            const conflict = bodyWrap.getElementsByTagName('conflict');
            if (cond !== null) {
                if (cond === 'remote-stream-error' && conflict.length > 0) {
                    cond = 'conflict';
                }
                this._conn._changeConnectStatus(Status.CONNFAIL, cond);
            } else {
                this._conn._changeConnectStatus(Status.CONNFAIL, 'unknown');
            }
            this._conn._doDisconnect(cond);
            return Status.CONNFAIL;
        }

        // check to make sure we don't overwrite these if _connect_cb is
        // called multiple times in the case of missing stream:features
        if (!this.sid) {
            this.sid = bodyWrap.getAttribute('sid');
        }
        const wind = bodyWrap.getAttribute('requests');
        if (wind) {
            this.window = parseInt(wind, 10);
        }
        const hold = bodyWrap.getAttribute('hold');
        if (hold) {
            this.hold = parseInt(hold, 10);
        }
        const wait = bodyWrap.getAttribute('wait');
        if (wait) {
            this.wait = parseInt(wait, 10);
        }
        const inactivity = bodyWrap.getAttribute('inactivity');
        if (inactivity) {
            this.inactivity = parseInt(inactivity, 10);
        }
    }

    /**
     * _Private_ part of Connection.disconnect for Bosh
     * @param {Element|Builder} pres - This stanza will be sent before disconnecting.
     */
    _disconnect(pres) {
        this._sendTerminate(pres);
    }

    /**
     * _Private_ function to disconnect.
     * Resets the SID and RID.
     */
    _doDisconnect() {
        this.sid = null;
        this.rid = Math.floor(Math.random() * 4294967295);
        if (this._conn._sessionCachingSupported()) {
            sessionStorage.removeItem('strophe-bosh-session');
        }

        this._conn.nextValidRid(this.rid);
    }

    /**
     * _Private_ function to check if the Request queue is empty.
     * @return {boolean} - True, if there are no Requests queued, False otherwise.
     */
    _emptyQueue() {
        return this._requests.length === 0;
    }

    /**
     * _Private_ function to call error handlers registered for HTTP errors.
     * @private
     * @param {Request} req - The request that is changing readyState.
     */
    _callProtocolErrorHandlers(req) {
        const reqStatus = Bosh._getRequestStatus(req);
        const err_callback = this._conn.protocolErrorHandlers.HTTP[reqStatus];
        if (err_callback) {
            err_callback.call(this, reqStatus);
        }
    }

    /**
     * _Private_ function to handle the error count.
     *
     * Requests are resent automatically until their error count reaches
     * 5.  Each time an error is encountered, this function is called to
     * increment the count and disconnect if the count is too high.
     * @private
     * @param {number} reqStatus - The request status.
     */
    _hitError(reqStatus) {
        this.errors++;
        log.warn('request errored, status: ' + reqStatus + ', number of errors: ' + this.errors);
        if (this.errors > 4) {
            this._conn._onDisconnectTimeout();
        }
    }

    /**
     * @callback connectionCallback
     * @param {Connection} connection
     */

    /**
     * Called on stream start/restart when no stream:features
     * has been received and sends a blank poll request.
     * @param {connectionCallback} callback
     */
    _no_auth_received(callback) {
        log.warn('Server did not yet offer a supported authentication ' + 'mechanism. Sending a blank poll request.');
        if (callback) {
            callback = callback.bind(this._conn);
        } else {
            callback = this._conn._connect_cb.bind(this._conn);
        }
        const body = this._buildBody();
        this._requests.push(
            new Request(
                body.tree(),
                this._onRequestStateChange.bind(this, callback),
                Number(body.tree().getAttribute('rid'))
            )
        );
        this._throttledRequestHandler();
    }

    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     * Cancels all remaining Requests and clears the queue.
     */
    _onDisconnectTimeout() {
        this._abortAllRequests();
    }

    /**
     * _Private_ helper function that makes sure all pending requests are aborted.
     */
    _abortAllRequests() {
        while (this._requests.length > 0) {
            const req = this._requests.pop();
            req.abort = true;
            req.xhr.abort();
            req.xhr.onreadystatechange = function () {};
        }
    }

    /**
     * _Private_ handler called by {@link Connection#_onIdle|Connection._onIdle()}.
     * Sends all queued Requests or polls with empty Request if there are none.
     */
    _onIdle() {
        const data = this._conn._data;
        // if no requests are in progress, poll
        if (this._conn.authenticated && this._requests.length === 0 && data.length === 0 && !this._conn.disconnecting) {
            log.debug('no requests during idle cycle, sending blank request');
            data.push(null);
        }

        if (this._conn.paused) {
            return;
        }

        if (this._requests.length < 2 && data.length > 0) {
            const body = this._buildBody();
            for (let i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    if (data[i] === 'restart') {
                        body.attrs({
                            'to': this._conn.domain,
                            'xml:lang': 'en',
                            'xmpp:restart': 'true',
                            'xmlns:xmpp': NS.BOSH,
                        });
                    } else {
                        body.cnode(/** @type {Element} */ (data[i])).up();
                    }
                }
            }
            delete this._conn._data;
            this._conn._data = [];
            this._requests.push(
                new Request(
                    body.tree(),
                    this._onRequestStateChange.bind(this, this._conn._dataRecv.bind(this._conn)),
                    Number(body.tree().getAttribute('rid'))
                )
            );
            this._throttledRequestHandler();
        }

        if (this._requests.length > 0) {
            const time_elapsed = this._requests[0].age();
            if (this._requests[0].dead !== null) {
                if (this._requests[0].timeDead() > Math.floor(timeoutMultiplier * this.wait)) {
                    this._throttledRequestHandler();
                }
            }
            if (time_elapsed > Math.floor(timeoutMultiplier * this.wait)) {
                log.warn(
                    'Request ' +
                        this._requests[0].id +
                        ' timed out, over ' +
                        Math.floor(timeoutMultiplier * this.wait) +
                        ' seconds since last activity'
                );
                this._throttledRequestHandler();
            }
        }
    }

    /**
     * Returns the HTTP status code from a {@link Request}
     * @private
     * @param {Request} req - The {@link Request} instance.
     * @param {number} [def] - The default value that should be returned if no status value was found.
     */
    static _getRequestStatus(req, def) {
        let reqStatus;
        if (req.xhr.readyState === 4) {
            try {
                reqStatus = req.xhr.status;
            } catch (e) {
                // ignore errors from undefined status attribute. Works
                // around a browser bug
                log.error(
                    `Caught an error while retrieving a request's status, reqStatus: ${reqStatus}, message: ${e.message}`
                );
            }
        }
        if (typeof reqStatus === 'undefined') {
            reqStatus = typeof def === 'number' ? def : 0;
        }
        return reqStatus;
    }

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
    _onRequestStateChange(func, req) {
        log.debug('request id ' + req.id + '.' + req.sends + ' state changed to ' + req.xhr.readyState);
        if (req.abort) {
            req.abort = false;
            return;
        }
        if (req.xhr.readyState !== 4) {
            // The request is not yet complete
            return;
        }
        const reqStatus = Bosh._getRequestStatus(req);
        this.lastResponseHeaders = req.xhr.getAllResponseHeaders();
        if (this._conn.disconnecting && reqStatus >= 400) {
            this._hitError(reqStatus);
            this._callProtocolErrorHandlers(req);
            return;
        }

        const reqIs0 = this._requests[0] === req;
        const reqIs1 = this._requests[1] === req;

        const valid_request = reqStatus > 0 && reqStatus < 500;
        const too_many_retries = req.sends > this._conn.maxRetries;
        if (valid_request || too_many_retries) {
            // remove from internal queue
            this._removeRequest(req);
            log.debug('request id ' + req.id + ' should now be removed');
        }

        if (reqStatus === 200) {
            // request succeeded
            // if request 1 finished, or request 0 finished and request
            // 1 is over _TIMEOUT seconds old, we need to
            // restart the other - both will be in the first spot, as the
            // completed request has been removed from the queue already
            if (
                reqIs1 ||
                (reqIs0 &&
                    this._requests.length > 0 &&
                    this._requests[0].age() > Math.floor(timeoutMultiplier * this.wait))
            ) {
                this._restartRequest(0);
            }
            this._conn.nextValidRid(req.rid + 1);
            log.debug('request id ' + req.id + '.' + req.sends + ' got 200');
            func(req); // call handler
            this.errors = 0;
        } else if (reqStatus === 0 || (reqStatus >= 400 && reqStatus < 600) || reqStatus >= 12000) {
            // request failed
            log.error('request id ' + req.id + '.' + req.sends + ' error ' + reqStatus + ' happened');
            this._hitError(reqStatus);
            this._callProtocolErrorHandlers(req);
            if (reqStatus >= 400 && reqStatus < 500) {
                this._conn._changeConnectStatus(Status.DISCONNECTING, null);
                this._conn._doDisconnect();
            }
        } else {
            log.error('request id ' + req.id + '.' + req.sends + ' error ' + reqStatus + ' happened');
        }

        if (!valid_request && !too_many_retries) {
            this._throttledRequestHandler();
        } else if (too_many_retries && !this._conn.connected) {
            this._conn._changeConnectStatus(Status.CONNFAIL, 'giving-up');
        }
    }

    /**
     * _Private_ function to process a request in the queue.
     *
     * This function takes requests off the queue and sends them and
     * restarts dead requests.
     * @private
     *
     * @param {number} i - The index of the request in the queue.
     */
    _processRequest(i) {
        let req = this._requests[i];
        const reqStatus = Bosh._getRequestStatus(req, -1);

        // make sure we limit the number of retries
        if (req.sends > this._conn.maxRetries) {
            this._conn._onDisconnectTimeout();
            return;
        }
        const time_elapsed = req.age();
        const primary_timeout = !isNaN(time_elapsed) && time_elapsed > Math.floor(timeoutMultiplier * this.wait);
        const secondary_timeout =
            req.dead !== null && req.timeDead() > Math.floor(secondaryTimeoutMultiplier * this.wait);
        const server_error = req.xhr.readyState === 4 && (reqStatus < 1 || reqStatus >= 500);

        if (primary_timeout || secondary_timeout || server_error) {
            if (secondary_timeout) {
                log.error(`Request ${this._requests[i].id} timed out (secondary), restarting`);
            }
            req.abort = true;
            req.xhr.abort();
            // setting to null fails on IE6, so set to empty function
            req.xhr.onreadystatechange = function () {};
            this._requests[i] = new Request(req.xmlData, req.origFunc, req.rid, req.sends);
            req = this._requests[i];
        }

        if (req.xhr.readyState === 0) {
            log.debug('request id ' + req.id + '.' + req.sends + ' posting');

            try {
                const content_type = this._conn.options.contentType || 'text/xml; charset=utf-8';
                req.xhr.open('POST', this._conn.service, this._conn.options.sync ? false : true);
                if (typeof req.xhr.setRequestHeader !== 'undefined') {
                    // IE9 doesn't have setRequestHeader
                    req.xhr.setRequestHeader('Content-Type', content_type);
                }
                if (this._conn.options.withCredentials) {
                    req.xhr.withCredentials = true;
                }
            } catch (e2) {
                log.error('XHR open failed: ' + e2.toString());
                if (!this._conn.connected) {
                    this._conn._changeConnectStatus(Status.CONNFAIL, 'bad-service');
                }
                this._conn.disconnect();
                return;
            }

            // Fires the XHR request -- may be invoked immediately
            // or on a gradually expanding retry window for reconnects
            const sendFunc = () => {
                req.date = new Date().valueOf();
                if (this._conn.options.customHeaders) {
                    const headers = this._conn.options.customHeaders;
                    for (const header in headers) {
                        if (Object.prototype.hasOwnProperty.call(headers, header)) {
                            req.xhr.setRequestHeader(header, headers[header]);
                        }
                    }
                }
                req.xhr.send(req.data);
            };

            // Implement progressive backoff for reconnects --
            // First retry (send === 1) should also be instantaneous
            if (req.sends > 1) {
                // Using a cube of the retry number creates a nicely
                // expanding retry window
                const backoff = Math.min(Math.floor(timeoutMultiplier * this.wait), Math.pow(req.sends, 3)) * 1000;
                setTimeout(function () {
                    // XXX: setTimeout should be called only with function expressions (23974bc1)
                    sendFunc();
                }, backoff);
            } else {
                sendFunc();
            }

            req.sends++;

            if (this.strip && req.xmlData.nodeName === 'body' && req.xmlData.childNodes.length) {
                this._conn.xmlOutput?.(req.xmlData.children[0]);
            } else {
                this._conn.xmlOutput?.(req.xmlData);
            }
            this._conn.rawOutput?.(req.data);
        } else {
            log.debug(
                '_processRequest: ' +
                    (i === 0 ? 'first' : 'second') +
                    ' request has readyState of ' +
                    req.xhr.readyState
            );
        }
    }

    /**
     * _Private_ function to remove a request from the queue.
     * @private
     * @param {Request} req - The request to remove.
     */
    _removeRequest(req) {
        log.debug('removing request');
        for (let i = this._requests.length - 1; i >= 0; i--) {
            if (req === this._requests[i]) {
                this._requests.splice(i, 1);
            }
        }
        // IE6 fails on setting to null, so set to empty function
        req.xhr.onreadystatechange = function () {};
        this._throttledRequestHandler();
    }

    /**
     * _Private_ function to restart a request that is presumed dead.
     * @private
     *
     * @param {number} i - The index of the request in the queue.
     */
    _restartRequest(i) {
        const req = this._requests[i];
        if (req.dead === null) {
            req.dead = new Date();
        }
        this._processRequest(i);
    }

    /**
     * _Private_ function to get a stanza out of a request.
     * Tries to extract a stanza out of a Request Object.
     * When this fails the current connection will be disconnected.
     *
     * @param {Request} req - The Request.
     * @return {Element} - The stanza that was passed.
     */
    _reqToData(req) {
        try {
            return req.getResponse();
        } catch (e) {
            if (e.message !== 'parsererror') {
                throw e;
            }
            this._conn.disconnect('strophe-parsererror');
        }
    }

    /**
     * _Private_ function to send initial disconnect sequence.
     *
     * This is the first step in a graceful disconnect.  It sends
     * the BOSH server a terminate body and includes an unavailable
     * presence if authentication has completed.
     * @private
     * @param {Element|Builder} [pres]
     */
    _sendTerminate(pres) {
        log.debug('_sendTerminate was called');
        const body = this._buildBody().attrs({ type: 'terminate' });

        const el = pres instanceof Builder ? pres.tree() : pres;

        if (pres) {
            body.cnode(el);
        }
        const req = new Request(
            body.tree(),
            this._onRequestStateChange.bind(this, this._conn._dataRecv.bind(this._conn)),
            Number(body.tree().getAttribute('rid'))
        );
        this._requests.push(req);
        this._throttledRequestHandler();
    }

    /**
     * _Private_ part of the Connection.send function for BOSH
     * Just triggers the RequestHandler to send the messages that are in the queue
     */
    _send() {
        clearTimeout(this._conn._idleTimeout);
        this._throttledRequestHandler();
        this._conn._idleTimeout = setTimeout(() => this._conn._onIdle(), 100);
    }

    /**
     * Send an xmpp:restart stanza.
     */
    _sendRestart() {
        this._throttledRequestHandler();
        clearTimeout(this._conn._idleTimeout);
    }

    /**
     * _Private_ function to throttle requests to the connection window.
     *
     * This function makes sure we don't send requests so fast that the
     * request ids overflow the connection window in the case that one
     * request died.
     * @private
     */
    _throttledRequestHandler() {
        if (!this._requests) {
            log.debug('_throttledRequestHandler called with ' + 'undefined requests');
        } else {
            log.debug('_throttledRequestHandler called with ' + this._requests.length + ' requests');
        }

        if (!this._requests || this._requests.length === 0) {
            return;
        }

        if (this._requests.length > 0) {
            this._processRequest(0);
        }

        if (this._requests.length > 1 && Math.abs(this._requests[0].rid - this._requests[1].rid) < this.window) {
            this._processRequest(1);
        }
    }
}

export default Bosh;
