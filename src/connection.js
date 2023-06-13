/*sessionStorage, setTimeout, clearTimeout */

import Handler from './handler';
import TimedHandler from './timed-handler';
import { $build, $iq, $pres } from './builder';
import { Status } from './constants';
import { Strophe } from './core';
import { addCookies, getText } from './utils';
import { atob, btoa } from 'abab';

/** Class: Strophe.Connection
 *  XMPP Connection manager.
 *
 *  This class is the main part of Strophe.  It manages a BOSH or websocket
 *  connection to an XMPP server and dispatches events to the user callbacks
 *  as data arrives. It supports SASL PLAIN, SASL SCRAM-SHA-1
 *  and legacy authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection. These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */

/** Constructor: Strophe.Connection
 *  Create and initialize a Strophe.Connection object.
 *
 *  The transport-protocol for this connection will be chosen automatically
 *  based on the given service parameter. URLs starting with "ws://" or
 *  "wss://" will use WebSockets, URLs starting with "http://", "https://"
 *  or without a protocol will use BOSH.
 *
 *  To make Strophe connect to the current host you can leave out the protocol
 *  and host part and just pass the path, e.g.
 *
 *  > let conn = new Strophe.Connection("/http-bind/");
 *
 *  Options common to both Websocket and BOSH:
 *  ------------------------------------------
 *
 *  cookies:
 *
 *  The *cookies* option allows you to pass in cookies to be added to the
 *  document. These cookies will then be included in the BOSH XMLHttpRequest
 *  or in the websocket connection.
 *
 *  The passed in value must be a map of cookie names and string values.
 *
 *  > { "myCookie": {
 *  >     "value": "1234",
 *  >     "domain": ".example.org",
 *  >     "path": "/",
 *  >     "expires": expirationDate
 *  >     }
 *  > }
 *
 *  Note that cookies can't be set in this way for other domains (i.e. cross-domain).
 *  Those cookies need to be set under those domains, for example they can be
 *  set server-side by making a XHR call to that domain to ask it to set any
 *  necessary cookies.
 *
 *  mechanisms:
 *
 *  The *mechanisms* option allows you to specify the SASL mechanisms that this
 *  instance of Strophe.Connection (and therefore your XMPP client) will
 *  support.
 *
 *  The value must be an array of objects with Strophe.SASLMechanism
 *  prototypes.
 *
 *  If nothing is specified, then the following mechanisms (and their
 *  priorities) are registered:
 *
 *      SCRAM-SHA-512 - 72
 *      SCRAM-SHA-384 - 71
 *      SCRAM-SHA-256 - 70
 *      SCRAM-SHA-1   - 60
 *      PLAIN         - 50
 *      OAUTHBEARER   - 40
 *      X-OAUTH2      - 30
 *      ANONYMOUS     - 20
 *      EXTERNAL      - 10
 *
 *  explicitResourceBinding:
 *
 *  If `explicitResourceBinding` is set to a truthy value, then the XMPP client
 *  needs to explicitly call `Strophe.Connection.prototype.bind` once the XMPP
 *  server has advertised the "urn:ietf:params:xml:ns:xmpp-bind" feature.
 *
 *  Making this step explicit allows client authors to first finish other
 *  stream related tasks, such as setting up an XEP-0198 Stream Management
 *  session, before binding the JID resource for this session.
 *
 *  WebSocket options:
 *  ------------------
 *
 *  protocol:
 *
 *  If you want to connect to the current host with a WebSocket connection you
 *  can tell Strophe to use WebSockets through a "protocol" attribute in the
 *  optional options parameter. Valid values are "ws" for WebSocket and "wss"
 *  for Secure WebSocket.
 *  So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
 *
 *  > let conn = new Strophe.Connection("/xmpp-websocket/", {protocol: "wss"});
 *
 *  Note that relative URLs _NOT_ starting with a "/" will also include the path
 *  of the current site.
 *
 *  Also because downgrading security is not permitted by browsers, when using
 *  relative URLs both BOSH and WebSocket connections will use their secure
 *  variants if the current connection to the site is also secure (https).
 *
 *  worker:
 *
 *  Set this option to URL from where the shared worker script should be loaded.
 *
 *  To run the websocket connection inside a shared worker.
 *  This allows you to share a single websocket-based connection between
 *  multiple Strophe.Connection instances, for example one per browser tab.
 *
 *  The script to use is the one in `src/shared-connection-worker.js`.
 *
 *  BOSH options:
 *  -------------
 *
 *  By adding "sync" to the options, you can control if requests will
 *  be made synchronously or not. The default behaviour is asynchronous.
 *  If you want to make requests synchronous, make "sync" evaluate to true.
 *  > let conn = new Strophe.Connection("/http-bind/", {sync: true});
 *
 *  You can also toggle this on an already established connection.
 *  > conn.options.sync = true;
 *
 *  The *customHeaders* option can be used to provide custom HTTP headers to be
 *  included in the XMLHttpRequests made.
 *
 *  The *keepalive* option can be used to instruct Strophe to maintain the
 *  current BOSH session across interruptions such as webpage reloads.
 *
 *  It will do this by caching the sessions tokens in sessionStorage, and when
 *  "restore" is called it will check whether there are cached tokens with
 *  which it can resume an existing session.
 *
 *  The *withCredentials* option should receive a Boolean value and is used to
 *  indicate wether cookies should be included in ajax requests (by default
 *  they're not).
 *  Set this value to true if you are connecting to a BOSH service
 *  and for some reason need to send cookies to it.
 *  In order for this to work cross-domain, the server must also enable
 *  credentials by setting the Access-Control-Allow-Credentials response header
 *  to "true". For most usecases however this setting should be false (which
 *  is the default).
 *  Additionally, when using Access-Control-Allow-Credentials, the
 *  Access-Control-Allow-Origin header can't be set to the wildcard "*", but
 *  instead must be restricted to actual domains.
 *
 *  The *contentType* option can be set to change the default Content-Type
 *  of "text/xml; charset=utf-8", which can be useful to reduce the amount of
 *  CORS preflight requests that are sent to the server.
 *
 *  Parameters:
 *    (String) service - The BOSH or WebSocket service URL.
 *    (Object) options - A hash of configuration options
 *
 *  Returns:
 *    A new Strophe.Connection object.
 */

export default class Connection {
    constructor(service, options) {
        // The service URL
        this.service = service;
        // Configuration options
        this.options = options || {};

        this.setProtocol();

        /* The connected JID. */
        this.jid = '';
        /* the JIDs domain */
        this.domain = null;
        /* stream:features */
        this.features = null;

        // SASL
        this._sasl_data = {};
        this.do_bind = false;
        this.do_session = false;
        this.mechanisms = {};

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
        this.protocolErrorHandlers = {
            'HTTP': {},
            'websocket': {},
        };

        this._idleTimeout = null;
        this._disconnectTimeout = null;

        this.authenticated = false;
        this.connected = false;
        this.disconnecting = false;
        this.do_authentication = true;
        this.paused = false;
        this.restored = false;

        this._data = [];
        this._uniqueId = 0;

        this._sasl_success_handler = null;
        this._sasl_failure_handler = null;
        this._sasl_challenge_handler = null;

        // Max retries before disconnecting
        this.maxRetries = 5;

        // Call onIdle callback every 1/10th of a second
        this._idleTimeout = setTimeout(() => this._onIdle(), 100);

        addCookies(this.options.cookies);
        this.registerSASLMechanisms(this.options.mechanisms);

        // A client must always respond to incoming IQ "set" and "get" stanzas.
        // See https://datatracker.ietf.org/doc/html/rfc6120#section-8.2.3
        //
        // This is a fallback handler which gets called when no other handler
        // was called for a received IQ "set" or "get".
        this.iqFallbackHandler = new Handler(
            (iq) =>
                this.send(
                    $iq({ type: 'error', id: iq.getAttribute('id') })
                        .c('error', { 'type': 'cancel' })
                        .c('service-unavailable', { 'xmlns': Strophe.NS.STANZAS })
                ),
            null,
            'iq',
            ['get', 'set']
        );

        // initialize plugins
        for (const k in Strophe._connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(Strophe._connectionPlugins, k)) {
                const F = function () {};
                F.prototype = Strophe._connectionPlugins[k];
                this[k] = new F();
                this[k].init(this);
            }
        }
    }

    /** Function: setProtocol
     *  Select protocal based on this.options or this.service
     */
    setProtocol() {
        const proto = this.options.protocol || '';
        if (this.options.worker) {
            this._proto = new Strophe.WorkerWebsocket(this);
        } else if (
            this.service.indexOf('ws:') === 0 ||
            this.service.indexOf('wss:') === 0 ||
            proto.indexOf('ws') === 0
        ) {
            this._proto = new Strophe.Websocket(this);
        } else {
            this._proto = new Strophe.Bosh(this);
        }
    }

    /** Function: reset
     *  Reset the connection.
     *
     *  This function should be called after a connection is disconnected
     *  before that connection is reused.
     */
    reset() {
        this._proto._reset();

        // SASL
        this.do_session = false;
        this.do_bind = false;

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        this.authenticated = false;
        this.connected = false;
        this.disconnecting = false;
        this.restored = false;

        this._data = [];
        this._requests = [];
        this._uniqueId = 0;
    }

    /** Function: pause
     *  Pause the request manager.
     *
     *  This will prevent Strophe from sending any more requests to the
     *  server.  This is very useful for temporarily pausing
     *  BOSH-Connections while a lot of send() calls are happening quickly.
     *  This causes Strophe to send the data in a single request, saving
     *  many request trips.
     */
    pause() {
        this.paused = true;
    }

    /** Function: resume
     *  Resume the request manager.
     *
     *  This resumes after pause() has been called.
     */
    resume() {
        this.paused = false;
    }

    /** Function: getUniqueId
     *  Generate a unique ID for use in <iq/> elements.
     *
     *  All <iq/> stanzas are required to have unique id attributes.  This
     *  function makes creating these easy.  Each connection instance has
     *  a counter which starts from zero, and the value of this counter
     *  plus a colon followed by the suffix becomes the unique id. If no
     *  suffix is supplied, the counter is used as the unique id.
     *
     *  Suffixes are used to make debugging easier when reading the stream
     *  data, and their use is recommended.  The counter resets to 0 for
     *  every new connection for the same reason.  For connections to the
     *  same server that authenticate the same way, all the ids should be
     *  the same, which makes it easy to see changes.  This is useful for
     *  automated testing as well.
     *
     *  Parameters:
     *    (String) suffix - A optional suffix to append to the id.
     *
     *  Returns:
     *    A unique string to be used for the id attribute.
     */
    // eslint-disable-next-line class-methods-use-this
    getUniqueId(suffix) {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0,
                v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        if (typeof suffix === 'string' || typeof suffix === 'number') {
            return uuid + ':' + suffix;
        } else {
            return uuid + '';
        }
    }

    /** Function: addProtocolErrorHandler
     *  Register a handler function for when a protocol (websocker or HTTP)
     *  error occurs.
     *
     *  NOTE: Currently only HTTP errors for BOSH requests are handled.
     *  Patches that handle websocket errors would be very welcome.
     *
     *  Parameters:
     *    (String) protocol - 'HTTP' or 'websocket'
     *    (Integer) status_code - Error status code (e.g 500, 400 or 404)
     *    (Function) callback - Function that will fire on Http error
     *
     *  Example:
     *  function onError(err_code){
     *    //do stuff
     *  }
     *
     *  let conn = Strophe.connect('http://example.com/http-bind');
     *  conn.addProtocolErrorHandler('HTTP', 500, onError);
     *  // Triggers HTTP 500 error and onError handler will be called
     *  conn.connect('user_jid@incorrect_jabber_host', 'secret', onConnect);
     */
    addProtocolErrorHandler(protocol, status_code, callback) {
        this.protocolErrorHandlers[protocol][status_code] = callback;
    }

    /** Function: connect
     *  Starts the connection process.
     *
     *  As the connection process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  The Parameters _wait_, _hold_ and _route_ are optional and only relevant
     *  for BOSH connections. Please see XEP 124 for a more detailed explanation
     *  of the optional parameters.
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID,
     *      or a full JID.  If a node is not supplied, SASL OAUTHBEARER or
     *      SASL ANONYMOUS authentication will be attempted (OAUTHBEARER will
     *      process the provided password value as an access token).
     *    (String or Object) pass - The user's password, or an object containing
     *      the users SCRAM client and server keys, in a fashion described as follows:
     *
     *      { name: String, representing the hash used (eg. SHA-1),
     *        salt: String, base64 encoded salt used to derive the client key,
     *        iter: Int,    the iteration count used to derive the client key,
     *        ck:   String, the base64 encoding of the SCRAM client key
     *        sk:   String, the base64 encoding of the SCRAM server key
     *      }
     *
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (String) route - The optional route value.
     *    (String) authcid - The optional alternative authentication identity
     *      (username) if intending to impersonate another user.
     *      When using the SASL-EXTERNAL authentication mechanism, for example
     *      with client certificates, then the authcid value is used to
     *      determine whether an authorization JID (authzid) should be sent to
     *      the server. The authzid should NOT be sent to the server if the
     *      authzid and authcid are the same. So to prevent it from being sent
     *      (for example when the JID is already contained in the client
     *      certificate), set authcid to that same JID. See XEP-178 for more
     *      details.
     *     (Integer) disconnection_timeout - The optional disconnection timeout
     *      in milliseconds before _doDisconnect will be called.
     */
    connect(jid, pass, callback, wait, hold, route, authcid, disconnection_timeout = 3000) {
        this.jid = jid;
        /** Variable: authzid
         *  Authorization identity.
         */
        this.authzid = Strophe.getBareJidFromJid(this.jid);

        /** Variable: authcid
         *  Authentication identity (User name).
         */
        this.authcid = authcid || Strophe.getNodeFromJid(this.jid);

        /** Variable: pass
         *  Authentication identity (User password).
         *
         */
        this.pass = pass;

        /** Variable: scram_keys
         *  The SASL SCRAM client and server keys. This variable will be populated with a non-null
         *  object of the above described form after a successful SCRAM connection
         *
         */
        this.scram_keys = null;

        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.restored = false;
        this.disconnection_timeout = disconnection_timeout;

        // parse jid for domain
        this.domain = Strophe.getDomainFromJid(this.jid);

        this._changeConnectStatus(Status.CONNECTING, null);

        this._proto._connect(wait, hold, route);
    }

    /** Function: attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    attach(jid, sid, rid, callback, wait, hold, wind) {
        if (this._proto._attach) {
            return this._proto._attach(jid, sid, rid, callback, wait, hold, wind);
        } else {
            const error = new Error('The "attach" method is not available for your connection protocol');
            error.name = 'StropheSessionError';
            throw error;
        }
    }

    /** Function: restore
     *  Attempt to restore a cached BOSH session.
     *
     *  This function is only useful in conjunction with providing the
     *  "keepalive":true option when instantiating a new Strophe.Connection.
     *
     *  When "keepalive" is set to true, Strophe will cache the BOSH tokens
     *  RID (Request ID) and SID (Session ID) and then when this function is
     *  called, it will attempt to restore the session from those cached
     *  tokens.
     *
     *  This function must therefore be called instead of connect or attach.
     *
     *  For an example on how to use it, please see examples/restore.js
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID or a full JID.
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    restore(jid, callback, wait, hold, wind) {
        if (this._sessionCachingSupported()) {
            this._proto._restore(jid, callback, wait, hold, wind);
        } else {
            const error = new Error('The "restore" method can only be used with a BOSH connection.');
            error.name = 'StropheSessionError';
            throw error;
        }
    }

    /** PrivateFunction: _sessionCachingSupported
     * Checks whether sessionStorage and JSON are supported and whether we're
     * using BOSH.
     */
    _sessionCachingSupported() {
        if (this._proto instanceof Strophe.Bosh) {
            if (!JSON) {
                return false;
            }
            try {
                sessionStorage.setItem('_strophe_', '_strophe_');
                sessionStorage.removeItem('_strophe_');
            } catch (e) {
                return false;
            }
            return true;
        }
        return false;
    }

    /** Function: xmlInput
     *  User overrideable function that receives XML data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlInput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML data received by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    xmlInput(elem) {
        return;
    }

    /** Function: xmlOutput
     *  User overrideable function that receives XML data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlOutput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XMLdata sent by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    xmlOutput(elem) {
        return;
    }

    /** Function: rawInput
     *  User overrideable function that receives raw data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawInput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data received by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    rawInput(data) {
        return;
    }

    /** Function: rawOutput
     *  User overrideable function that receives raw data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawOutput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data sent by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    rawOutput(data) {
        return;
    }

    /** Function: nextValidRid
     *  User overrideable function that receives the new valid rid.
     *
     *  The default function does nothing. User code can override this with
     *  > Strophe.Connection.nextValidRid = function (rid) {
     *  >    (user code)
     *  > };
     *
     *  Parameters:
     *    (Number) rid - The next valid rid
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    nextValidRid(rid) {
        return;
    }

    /** Function: send
     *  Send a stanza.
     *
     *  This function is called to push data onto the send queue to
     *  go out over the wire.  Whenever a request is sent to the BOSH
     *  server, all pending data is sent and the queue is flushed.
     *
     *  Parameters:
     *    (XMLElement |
     *     [XMLElement] |
     *     Strophe.Builder) elem - The stanza to send.
     */
    send(elem) {
        if (elem === null) {
            return;
        }
        if (typeof elem.sort === 'function') {
            for (let i = 0; i < elem.length; i++) {
                this._queueData(elem[i]);
            }
        } else if (typeof elem.tree === 'function') {
            this._queueData(elem.tree());
        } else {
            this._queueData(elem);
        }
        this._proto._send();
    }

    /** Function: flush
     *  Immediately send any pending outgoing data.
     *
     *  Normally send() queues outgoing data until the next idle period
     *  (100ms), which optimizes network use in the common cases when
     *  several send()s are called in succession. flush() can be used to
     *  immediately send all pending data.
     */
    flush() {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    }

    /** Function: sendPresence
     *  Helper function to send presence stanzas. The main benefit is for
     *  sending presence stanzas for which you expect a responding presence
     *  stanza with the same id (for example when leaving a chat room).
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the presence.
     */
    sendPresence(elem, callback, errback, timeout) {
        let timeoutHandler = null;
        if (typeof elem.tree === 'function') {
            elem = elem.tree();
        }
        let id = elem.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendPresence');
            elem.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                (stanza) => {
                    // remove timeout handler if there is one
                    if (timeoutHandler) {
                        this.deleteTimedHandler(timeoutHandler);
                    }
                    if (stanza.getAttribute('type') === 'error') {
                        if (errback) {
                            errback(stanza);
                        }
                    } else if (callback) {
                        callback(stanza);
                    }
                },
                null,
                'presence',
                null,
                id
            );

            // if timeout specified, set up a timeout handler.
            if (timeout) {
                timeoutHandler = this.addTimedHandler(timeout, () => {
                    // get rid of normal handler
                    this.deleteHandler(handler);
                    // call errback on timeout with null stanza
                    if (errback) {
                        errback(null);
                    }
                    return false;
                });
            }
        }
        this.send(elem);
        return id;
    }

    /** Function: sendIQ
     *  Helper function to send IQ stanzas.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the IQ.
     */
    sendIQ(elem, callback, errback, timeout) {
        let timeoutHandler = null;
        if (typeof elem.tree === 'function') {
            elem = elem.tree();
        }
        let id = elem.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendIQ');
            elem.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                (stanza) => {
                    // remove timeout handler if there is one
                    if (timeoutHandler) {
                        this.deleteTimedHandler(timeoutHandler);
                    }
                    const iqtype = stanza.getAttribute('type');
                    if (iqtype === 'result') {
                        if (callback) {
                            callback(stanza);
                        }
                    } else if (iqtype === 'error') {
                        if (errback) {
                            errback(stanza);
                        }
                    } else {
                        const error = new Error(`Got bad IQ type of ${iqtype}`);
                        error.name = 'StropheError';
                        throw error;
                    }
                },
                null,
                'iq',
                ['error', 'result'],
                id
            );

            // if timeout specified, set up a timeout handler.
            if (timeout) {
                timeoutHandler = this.addTimedHandler(timeout, () => {
                    // get rid of normal handler
                    this.deleteHandler(handler);
                    // call errback on timeout with null stanza
                    if (errback) {
                        errback(null);
                    }
                    return false;
                });
            }
        }
        this.send(elem);
        return id;
    }

    /** PrivateFunction: _queueData
     *  Queue outgoing data for later sending.  Also ensures that the data
     *  is a DOMElement.
     */
    _queueData(element) {
        if (element === null || !element.tagName || !element.childNodes) {
            const error = new Error('Cannot queue non-DOMElement.');
            error.name = 'StropheError';
            throw error;
        }
        this._data.push(element);
    }

    /** PrivateFunction: _sendRestart
     *  Send an xmpp:restart stanza.
     */
    _sendRestart() {
        this._data.push('restart');
        this._proto._sendRestart();
        this._idleTimeout = setTimeout(() => this._onIdle(), 100);
    }

    /** Function: addTimedHandler
     *  Add a timed handler to the connection.
     *
     *  This function adds a timed handler.  The provided handler will
     *  be called every period milliseconds until it returns false,
     *  the connection is terminated, or the handler is removed.  Handlers
     *  that wish to continue being invoked should return true.
     *
     *  Because of method binding it is necessary to save the result of
     *  this function if you wish to remove a handler with
     *  deleteTimedHandler().
     *
     *  Note that user handlers are not active until authentication is
     *  successful.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addTimedHandler(period, handler) {
        const thand = new Strophe.TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    }

    /** Function: deleteTimedHandler
     *  Delete a timed handler for a connection.
     *
     *  This function removes a timed handler from the connection.  The
     *  handRef parameter is *not* the function passed to addTimedHandler(),
     *  but is the reference returned from addTimedHandler().
     *
     *  Parameters:
     *    (Strophe.TimedHandler) handRef - The handler reference.
     */
    deleteTimedHandler(handRef) {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    }

    /** Function: addHandler
     *  Add a stanza handler for the connection.
     *
     *  This function adds a stanza handler to the connection.  The
     *  handler callback will be called for any stanza that matches
     *  the parameters.  Note that if multiple parameters are supplied,
     *  they must all match for the handler to be invoked.
     *
     *  The handler will receive the stanza that triggered it as its argument.
     *  *The handler should return true if it is to be invoked again;
     *  returning false will remove the handler after it returns.*
     *
     *  As a convenience, the ns parameters applies to the top level element
     *  and also any of its immediate children.  This is primarily to make
     *  matching /iq/query elements easy.
     *
     *  Options
     *  ~~~~~~~
     *  With the options argument, you can specify boolean flags that affect how
     *  matches are being done.
     *
     *  Currently two flags exist:
     *
     *  - matchBareFromJid:
     *      When set to true, the from parameter and the
     *      from attribute on the stanza will be matched as bare JIDs instead
     *      of full JIDs. To use this, pass {matchBareFromJid: true} as the
     *      value of options. The default value for matchBareFromJid is false.
     *
     *  - ignoreNamespaceFragment:
     *      When set to true, a fragment specified on the stanza's namespace
     *      URL will be ignored when it's matched with the one configured for
     *      the handler.
     *
     *      This means that if you register like this:
     *      >   connection.addHandler(
     *      >       handler,
     *      >       'http://jabber.org/protocol/muc',
     *      >       null, null, null, null,
     *      >       {'ignoreNamespaceFragment': true}
     *      >   );
     *
     *      Then a stanza with XML namespace of
     *      'http://jabber.org/protocol/muc#user' will also be matched. If
     *      'ignoreNamespaceFragment' is false, then only stanzas with
     *      'http://jabber.org/protocol/muc' will be matched.
     *
     *  Deleting the handler
     *  ~~~~~~~~~~~~~~~~~~~~
     *  The return value should be saved if you wish to remove the handler
     *  with deleteHandler().
     *
     *  Parameters:
     *    (Function) handler - The user callback.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String|Array) type - The stanza type (or types if an array) to match.
     *    (String) id - The stanza id attribute to match.
     *    (String) from - The stanza from attribute to match.
     *    (String) options - The handler options
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addHandler(handler, ns, name, type, id, from, options) {
        const hand = new Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    }

    /** Function: deleteHandler
     *  Delete a stanza handler for a connection.
     *
     *  This function removes a stanza handler from the connection.  The
     *  handRef parameter is *not* the function passed to addHandler(),
     *  but is the reference returned from addHandler().
     *
     *  Parameters:
     *    (Handler) handRef - The handler reference.
     */
    deleteHandler(handRef) {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeHandlers.push(handRef);
        // If a handler is being deleted while it is being added,
        // prevent it from getting added
        const i = this.addHandlers.indexOf(handRef);
        if (i >= 0) {
            this.addHandlers.splice(i, 1);
        }
    }

    /** Function: registerSASLMechanisms
     *
     * Register the SASL mechanisms which will be supported by this instance of
     * Strophe.Connection (i.e. which this XMPP client will support).
     *
     *  Parameters:
     *    (Array) mechanisms - Array of objects with Strophe.SASLMechanism prototypes
     *
     */
    registerSASLMechanisms(mechanisms) {
        this.mechanisms = {};
        mechanisms = mechanisms || [
            Strophe.SASLAnonymous,
            Strophe.SASLExternal,
            Strophe.SASLOAuthBearer,
            Strophe.SASLXOAuth2,
            Strophe.SASLPlain,
            Strophe.SASLSHA1,
            Strophe.SASLSHA256,
            Strophe.SASLSHA384,
            Strophe.SASLSHA512,
        ];
        mechanisms.forEach((m) => this.registerSASLMechanism(m));
    }

    /** Function: registerSASLMechanism
     *
     * Register a single SASL mechanism, to be supported by this client.
     *
     *  Parameters:
     *    (Object) mechanism - Object with a Strophe.SASLMechanism prototype
     *
     */
    registerSASLMechanism(Mechanism) {
        const mechanism = new Mechanism();
        this.mechanisms[mechanism.mechname] = mechanism;
    }

    /** Function: disconnect
     *  Start the graceful disconnection process.
     *
     *  This function starts the disconnection process.  This process starts
     *  by sending unavailable presence and sending BOSH body of type
     *  terminate.  A timeout handler makes sure that disconnection happens
     *  even if the BOSH server does not respond.
     *  If the Connection object isn't connected, at least tries to abort all pending requests
     *  so the connection object won't generate successful requests (which were already opened).
     *
     *  The user supplied connection callback will be notified of the
     *  progress as this process happens.
     *
     *  Parameters:
     *    (String) reason - The reason the disconnect is occuring.
     */
    disconnect(reason) {
        this._changeConnectStatus(Status.DISCONNECTING, reason);
        if (reason) {
            Strophe.warn('Disconnect was called because: ' + reason);
        } else {
            Strophe.info('Disconnect was called');
        }
        if (this.connected) {
            let pres = false;
            this.disconnecting = true;
            if (this.authenticated) {
                pres = $pres({
                    'xmlns': Strophe.NS.CLIENT,
                    'type': 'unavailable',
                });
            }
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                this.disconnection_timeout,
                this._onDisconnectTimeout.bind(this)
            );
            this._proto._disconnect(pres);
        } else {
            Strophe.warn('Disconnect was called before Strophe connected to the server');
            this._proto._abortAllRequests();
            this._doDisconnect();
        }
    }

    /** PrivateFunction: _changeConnectStatus
     *  _Private_ helper function that makes sure plugins and the user's
     *  callback are notified of connection status changes.
     *
     *  Parameters:
     *    (Integer) status - the new connection status, one of the values
     *      in Strophe.Status
     *    (String) condition - the error condition or null
     *    (XMLElement) elem - The triggering stanza.
     */
    _changeConnectStatus(status, condition, elem) {
        // notify all plugins listening for status changes
        for (const k in Strophe._connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(Strophe._connectionPlugins, k)) {
                const plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        Strophe.error(`${k} plugin caused an exception changing status: ${err}`);
                    }
                }
            }
        }
        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition, elem);
            } catch (e) {
                Strophe._handleError(e);
                Strophe.error(`User connection callback caused an exception: ${e}`);
            }
        }
    }

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  This is the last piece of the disconnection logic.  This resets the
     *  connection and alerts the user's connection callback.
     */
    _doDisconnect(condition) {
        if (typeof this._idleTimeout === 'number') {
            clearTimeout(this._idleTimeout);
        }

        // Cancel Disconnect Timeout
        if (this._disconnectTimeout !== null) {
            this.deleteTimedHandler(this._disconnectTimeout);
            this._disconnectTimeout = null;
        }

        Strophe.debug('_doDisconnect was called');
        this._proto._doDisconnect();

        this.authenticated = false;
        this.disconnecting = false;
        this.restored = false;

        // delete handlers
        this.handlers = [];
        this.timedHandlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        // tell the parent we disconnected
        this._changeConnectStatus(Status.DISCONNECTED, condition);
        this.connected = false;
    }

    /** PrivateFunction: _dataRecv
     *  _Private_ handler to processes incoming data from the the connection.
     *
     *  Except for _connect_cb handling the initial connection request,
     *  this function handles the incoming data for all requests.  This
     *  function also fires stanza handlers that match each incoming
     *  stanza.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request that has data ready.
     *    (string) req - The stanza a raw string (optiona).
     */
    _dataRecv(req, raw) {
        const elem = this._proto._reqToData(req);
        if (elem === null) {
            return;
        }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (elem.nodeName === this._proto.strip && elem.childNodes.length) {
                this.xmlInput(elem.childNodes[0]);
            } else {
                this.xmlInput(elem);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(elem));
            }
        }

        // remove handlers scheduled for deletion
        while (this.removeHandlers.length > 0) {
            const hand = this.removeHandlers.pop();
            const i = this.handlers.indexOf(hand);
            if (i >= 0) {
                this.handlers.splice(i, 1);
            }
        }

        // add handlers scheduled for addition
        while (this.addHandlers.length > 0) {
            this.handlers.push(this.addHandlers.pop());
        }

        // handle graceful disconnect
        if (this.disconnecting && this._proto._emptyQueue()) {
            this._doDisconnect();
            return;
        }

        const type = elem.getAttribute('type');
        if (type !== null && type === 'terminate') {
            // Don't process stanzas that come in after disconnect
            if (this.disconnecting) {
                return;
            }
            // an error occurred
            let cond = elem.getAttribute('condition');
            const conflict = elem.getElementsByTagName('conflict');
            if (cond !== null) {
                if (cond === 'remote-stream-error' && conflict.length > 0) {
                    cond = 'conflict';
                }
                this._changeConnectStatus(Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Status.CONNFAIL, Strophe.ErrorCondition.UNKOWN_REASON);
            }
            this._doDisconnect(cond);
            return;
        }

        // send each incoming stanza through the handler chain
        Strophe.forEachChild(elem, null, (child) => {
            const matches = [];
            this.handlers = this.handlers.reduce((handlers, handler) => {
                try {
                    if (handler.isMatch(child) && (this.authenticated || !handler.user)) {
                        if (handler.run(child)) {
                            handlers.push(handler);
                        }
                        matches.push(handler);
                    } else {
                        handlers.push(handler);
                    }
                } catch (e) {
                    // if the handler throws an exception, we consider it as false
                    Strophe.warn('Removing Strophe handlers due to uncaught exception: ' + e.message);
                }

                return handlers;
            }, []);

            // If no handler was fired for an incoming IQ with type="set",
            // then we return an IQ error stanza with service-unavailable.
            if (!matches.length && this.iqFallbackHandler.isMatch(child)) {
                this.iqFallbackHandler.run(child);
            }
        });
    }

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the initial connection request
     *  response from the BOSH server. It is used to set up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Strophe.Request) req - The current request.
     *    (Function) _callback - low level (xmpp) connect callback function.
     *      Useful for plugins with their own xmpp connect callback (when they
     *      want to do something special).
     */
    _connect_cb(req, _callback, raw) {
        Strophe.debug('_connect_cb was called');
        this.connected = true;

        let bodyWrap;
        try {
            bodyWrap = this._proto._reqToData(req);
        } catch (e) {
            if (e.name !== Strophe.ErrorCondition.BAD_FORMAT) {
                throw e;
            }
            this._changeConnectStatus(Status.CONNFAIL, Strophe.ErrorCondition.BAD_FORMAT);
            this._doDisconnect(Strophe.ErrorCondition.BAD_FORMAT);
        }
        if (!bodyWrap) {
            return;
        }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (bodyWrap.nodeName === this._proto.strip && bodyWrap.childNodes.length) {
                this.xmlInput(bodyWrap.childNodes[0]);
            } else {
                this.xmlInput(bodyWrap);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(bodyWrap));
            }
        }

        const conncheck = this._proto._connect_cb(bodyWrap);
        if (conncheck === Status.CONNFAIL) {
            return;
        }

        // Check for the stream:features tag
        let hasFeatures;
        if (bodyWrap.getElementsByTagNameNS) {
            hasFeatures = bodyWrap.getElementsByTagNameNS(Strophe.NS.STREAM, 'features').length > 0;
        } else {
            hasFeatures =
                bodyWrap.getElementsByTagName('stream:features').length > 0 ||
                bodyWrap.getElementsByTagName('features').length > 0;
        }
        if (!hasFeatures) {
            this._proto._no_auth_received(_callback);
            return;
        }

        const matched = Array.from(bodyWrap.getElementsByTagName('mechanism'))
            .map((m) => this.mechanisms[m.textContent])
            .filter((m) => m);

        if (matched.length === 0) {
            if (bodyWrap.getElementsByTagName('auth').length === 0) {
                // There are no matching SASL mechanisms and also no legacy
                // auth available.
                this._proto._no_auth_received(_callback);
                return;
            }
        }
        if (this.do_authentication !== false) {
            this.authenticate(matched);
        }
    }

    /** Function: sortMechanismsByPriority
     *
     *  Sorts an array of objects with prototype SASLMechanism according to
     *  their priorities.
     *
     *  Parameters:
     *    (Array) mechanisms - Array of SASL mechanisms.
     *
     */
    // eslint-disable-next-line  class-methods-use-this
    sortMechanismsByPriority(mechanisms) {
        // Sorting mechanisms according to priority.
        for (let i = 0; i < mechanisms.length - 1; ++i) {
            let higher = i;
            for (let j = i + 1; j < mechanisms.length; ++j) {
                if (mechanisms[j].priority > mechanisms[higher].priority) {
                    higher = j;
                }
            }
            if (higher !== i) {
                const swap = mechanisms[i];
                mechanisms[i] = mechanisms[higher];
                mechanisms[higher] = swap;
            }
        }
        return mechanisms;
    }

    /** Function: authenticate
     * Set up authentication
     *
     *  Continues the initial connection request by setting up authentication
     *  handlers and starting the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Array) matched - Array of SASL mechanisms supported.
     *
     */
    authenticate(matched) {
        if (!this._attemptSASLAuth(matched)) {
            this._attemptLegacyAuth();
        }
    }

    /** PrivateFunction: _attemptSASLAuth
     *
     *  Iterate through an array of SASL mechanisms and attempt authentication
     *  with the highest priority (enabled) mechanism.
     *
     *  Parameters:
     *    (Array) mechanisms - Array of SASL mechanisms.
     *
     *  Returns:
     *    (Boolean) mechanism_found - true or false, depending on whether a
     *          valid SASL mechanism was found with which authentication could be
     *          started.
     */
    _attemptSASLAuth(mechanisms) {
        mechanisms = this.sortMechanismsByPriority(mechanisms || []);
        let mechanism_found = false;
        for (let i = 0; i < mechanisms.length; ++i) {
            if (!mechanisms[i].test(this)) {
                continue;
            }
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this),
                null,
                'success',
                null,
                null
            );
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this),
                null,
                'failure',
                null,
                null
            );
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_challenge_cb.bind(this),
                null,
                'challenge',
                null,
                null
            );

            this._sasl_mechanism = mechanisms[i];
            this._sasl_mechanism.onStart(this);

            const request_auth_exchange = $build('auth', {
                'xmlns': Strophe.NS.SASL,
                'mechanism': this._sasl_mechanism.mechname,
            });
            if (this._sasl_mechanism.isClientFirst) {
                const response = this._sasl_mechanism.clientChallenge(this);
                request_auth_exchange.t(btoa(response));
            }
            this.send(request_auth_exchange.tree());
            mechanism_found = true;
            break;
        }
        return mechanism_found;
    }

    /** PrivateFunction: _sasl_challenge_cb
     *  _Private_ handler for the SASL challenge
     *
     */
    async _sasl_challenge_cb(elem) {
        const challenge = atob(getText(elem));
        const response = await this._sasl_mechanism.onChallenge(this, challenge);
        const stanza = $build('response', { 'xmlns': Strophe.NS.SASL });
        if (response !== '') {
            stanza.t(btoa(response));
        }
        this.send(stanza.tree());
        return true;
    }

    /** PrivateFunction: _attemptLegacyAuth
     *
     *  Attempt legacy (i.e. non-SASL) authentication.
     */
    _attemptLegacyAuth() {
        if (Strophe.getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(Status.CONNFAIL, Strophe.ErrorCondition.MISSING_JID_NODE);
            this.disconnect(Strophe.ErrorCondition.MISSING_JID_NODE);
        } else {
            // Fall back to legacy authentication
            this._changeConnectStatus(Status.AUTHENTICATING, null);
            this._addSysHandler(this._onLegacyAuthIQResult.bind(this), null, null, null, '_auth_1');
            this.send(
                $iq({
                    'type': 'get',
                    'to': this.domain,
                    'id': '_auth_1',
                })
                    .c('query', { xmlns: Strophe.NS.AUTH })
                    .c('username', {})
                    .t(Strophe.getNodeFromJid(this.jid))
                    .tree()
            );
        }
    }

    /** PrivateFunction: _onLegacyAuthIQResult
     *  _Private_ handler for legacy authentication.
     *
     *  This handler is called in response to the initial <iq type='get'/>
     *  for legacy authentication.  It builds an authentication <iq/> and
     *  sends it, creating a handler (calling back to _auth2_cb()) to
     *  handle the result
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    // eslint-disable-next-line no-unused-vars
    _onLegacyAuthIQResult(elem) {
        // build plaintext auth iq
        const iq = $iq({ type: 'set', id: '_auth_2' })
            .c('query', { xmlns: Strophe.NS.AUTH })
            .c('username', {})
            .t(Strophe.getNodeFromJid(this.jid))
            .up()
            .c('password')
            .t(this.pass);

        if (!Strophe.getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = Strophe.getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(Strophe.getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null, null, null, '_auth_2');
        this.send(iq.tree());
        return false;
    }

    /** PrivateFunction: _sasl_success_cb
     *  _Private_ handler for succesful SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_success_cb(elem) {
        if (this._sasl_data['server-signature']) {
            let serverSignature;
            const success = atob(getText(elem));
            const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
            const matches = success.match(attribMatch);
            if (matches[1] === 'v') {
                serverSignature = matches[2];
            }
            if (serverSignature !== this._sasl_data['server-signature']) {
                // remove old handlers
                this.deleteHandler(this._sasl_failure_handler);
                this._sasl_failure_handler = null;
                if (this._sasl_challenge_handler) {
                    this.deleteHandler(this._sasl_challenge_handler);
                    this._sasl_challenge_handler = null;
                }
                this._sasl_data = {};
                return this._sasl_failure_cb(null);
            }
        }
        Strophe.info('SASL authentication succeeded.');

        if (this._sasl_data.keys) {
            this.scram_keys = this._sasl_data.keys;
        }

        if (this._sasl_mechanism) {
            this._sasl_mechanism.onSuccess();
        }
        // remove old handlers
        this.deleteHandler(this._sasl_failure_handler);
        this._sasl_failure_handler = null;
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }
        const streamfeature_handlers = [];
        const wrapper = (handlers, elem) => {
            while (handlers.length) {
                this.deleteHandler(handlers.pop());
            }
            this._onStreamFeaturesAfterSASL(elem);
            return false;
        };
        streamfeature_handlers.push(
            this._addSysHandler((elem) => wrapper(streamfeature_handlers, elem), null, 'stream:features', null, null)
        );

        streamfeature_handlers.push(
            this._addSysHandler(
                (elem) => wrapper(streamfeature_handlers, elem),
                Strophe.NS.STREAM,
                'features',
                null,
                null
            )
        );

        // we must send an xmpp:restart now
        this._sendRestart();
        return false;
    }

    /** PrivateFunction: _onStreamFeaturesAfterSASL
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onStreamFeaturesAfterSASL(elem) {
        // save stream:features for future usage
        this.features = elem;
        for (let i = 0; i < elem.childNodes.length; i++) {
            const child = elem.childNodes[i];
            if (child.nodeName === 'bind') {
                this.do_bind = true;
            }
            if (child.nodeName === 'session') {
                this.do_session = true;
            }
        }

        if (!this.do_bind) {
            this._changeConnectStatus(Status.AUTHFAIL, null);
            return false;
        } else if (!this.options.explicitResourceBinding) {
            this.bind();
        } else {
            this._changeConnectStatus(Status.BINDREQUIRED, null);
        }
        return false;
    }

    /** Function: bind
     *
     *  Sends an IQ to the XMPP server to bind a JID resource for this session.
     *
     *  https://tools.ietf.org/html/rfc6120#section-7.5
     *
     *  If `explicitResourceBinding` was set to a truthy value in the options
     *  passed to the Strophe.Connection constructor, then this function needs
     *  to be called explicitly by the client author.
     *
     *  Otherwise it'll be called automatically as soon as the XMPP server
     *  advertises the "urn:ietf:params:xml:ns:xmpp-bind" stream feature.
     */
    bind() {
        if (!this.do_bind) {
            Strophe.log(Strophe.LogLevel.INFO, `Strophe.Connection.prototype.bind called but "do_bind" is false`);
            return;
        }
        this._addSysHandler(this._onResourceBindResultIQ.bind(this), null, null, null, '_bind_auth_2');

        const resource = Strophe.getResourceFromJid(this.jid);
        if (resource) {
            this.send(
                $iq({ type: 'set', id: '_bind_auth_2' })
                    .c('bind', { xmlns: Strophe.NS.BIND })
                    .c('resource', {})
                    .t(resource)
                    .tree()
            );
        } else {
            this.send($iq({ type: 'set', id: '_bind_auth_2' }).c('bind', { xmlns: Strophe.NS.BIND }).tree());
        }
    }

    /** PrivateFunction: _onResourceBindIQ
     *  _Private_ handler for binding result and session start.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onResourceBindResultIQ(elem) {
        if (elem.getAttribute('type') === 'error') {
            Strophe.warn('Resource binding failed.');
            const conflict = elem.getElementsByTagName('conflict');
            let condition;
            if (conflict.length > 0) {
                condition = Strophe.ErrorCondition.CONFLICT;
            }
            this._changeConnectStatus(Status.AUTHFAIL, condition, elem);
            return false;
        }
        // TODO - need to grab errors
        const bind = elem.getElementsByTagName('bind');
        if (bind.length > 0) {
            const jidNode = bind[0].getElementsByTagName('jid');
            if (jidNode.length > 0) {
                this.authenticated = true;
                this.jid = getText(jidNode[0]);
                if (this.do_session) {
                    this._establishSession();
                } else {
                    this._changeConnectStatus(Status.CONNECTED, null);
                }
            }
        } else {
            Strophe.warn('Resource binding failed.');
            this._changeConnectStatus(Status.AUTHFAIL, null, elem);
            return false;
        }
    }

    /** PrivateFunction: _establishSession
     *  Send IQ request to establish a session with the XMPP server.
     *
     *  See https://xmpp.org/rfcs/rfc3921.html#session
     *
     *  Note: The protocol for session establishment has been determined as
     *  unnecessary and removed in RFC-6121.
     */
    _establishSession() {
        if (!this.do_session) {
            throw new Error(
                `Strophe.Connection.prototype._establishSession ` +
                    `called but apparently ${Strophe.NS.SESSION} wasn't advertised by the server`
            );
        }
        this._addSysHandler(this._onSessionResultIQ.bind(this), null, null, null, '_session_auth_2');

        this.send($iq({ type: 'set', id: '_session_auth_2' }).c('session', { xmlns: Strophe.NS.SESSION }).tree());
    }

    /** PrivateFunction: _onSessionResultIQ
     *  _Private_ handler for the server's IQ response to a client's session
     *  request.
     *
     *  This sets Connection.authenticated to true on success, which
     *  starts the processing of user handlers.
     *
     *  See https://xmpp.org/rfcs/rfc3921.html#session
     *
     *  Note: The protocol for session establishment has been determined as
     *  unnecessary and removed in RFC-6121.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onSessionResultIQ(elem) {
        if (elem.getAttribute('type') === 'result') {
            this.authenticated = true;
            this._changeConnectStatus(Status.CONNECTED, null);
        } else if (elem.getAttribute('type') === 'error') {
            this.authenticated = false;
            Strophe.warn('Session creation failed.');
            this._changeConnectStatus(Status.AUTHFAIL, null, elem);
            return false;
        }
        return false;
    }

    /** PrivateFunction: _sasl_failure_cb
     *  _Private_ handler for SASL authentication failure.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_failure_cb(elem) {
        // delete unneeded handlers
        if (this._sasl_success_handler) {
            this.deleteHandler(this._sasl_success_handler);
            this._sasl_success_handler = null;
        }
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        if (this._sasl_mechanism) this._sasl_mechanism.onFailure();
        this._changeConnectStatus(Status.AUTHFAIL, null, elem);
        return false;
    }

    /** PrivateFunction: _auth2_cb
     *  _Private_ handler to finish legacy authentication.
     *
     *  This handler is called when the result from the jabber:iq:auth
     *  <iq/> stanza is returned.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth2_cb(elem) {
        if (elem.getAttribute('type') === 'result') {
            this.authenticated = true;
            this._changeConnectStatus(Status.CONNECTED, null);
        } else if (elem.getAttribute('type') === 'error') {
            this._changeConnectStatus(Status.AUTHFAIL, null, elem);
            this.disconnect('authentication failed');
        }
        return false;
    }

    /** PrivateFunction: _addSysTimedHandler
     *  _Private_ function to add a system level timed handler.
     *
     *  This function is used to add a Strophe.TimedHandler for the
     *  library code.  System timed handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     */
    _addSysTimedHandler(period, handler) {
        const thand = new TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    }

    /** PrivateFunction: _addSysHandler
     *  _Private_ function to add a system level stanza handler.
     *
     *  This function is used to add a Handler for the
     *  library code.  System stanza handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Function) handler - The callback function.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     */
    _addSysHandler(handler, ns, name, type, id) {
        const hand = new Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    }

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  If the graceful disconnect process does not complete within the
     *  time allotted, this handler finishes the disconnect anyway.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onDisconnectTimeout() {
        Strophe.debug('_onDisconnectTimeout was called');
        this._changeConnectStatus(Status.CONNTIMEOUT, null);
        this._proto._onDisconnectTimeout();
        // actually disconnect
        this._doDisconnect();
        return false;
    }

    /** PrivateFunction: _onIdle
     *  _Private_ handler to process events during idle cycle.
     *
     *  This handler is called every 100ms to fire timed handlers that
     *  are ready and keep poll requests going.
     */
    _onIdle() {
        // add timed handlers scheduled for addition
        // NOTE: we add before remove in the case a timed handler is
        // added and then deleted before the next _onIdle() call.
        while (this.addTimeds.length > 0) {
            this.timedHandlers.push(this.addTimeds.pop());
        }

        // remove timed handlers that have been scheduled for deletion
        while (this.removeTimeds.length > 0) {
            const thand = this.removeTimeds.pop();
            const i = this.timedHandlers.indexOf(thand);
            if (i >= 0) {
                this.timedHandlers.splice(i, 1);
            }
        }

        // call ready timed handlers
        const now = new Date().getTime();
        const newList = [];
        for (let i = 0; i < this.timedHandlers.length; i++) {
            const thand = this.timedHandlers[i];
            if (this.authenticated || !thand.user) {
                const since = thand.lastCalled + thand.period;
                if (since - now <= 0) {
                    if (thand.run()) {
                        newList.push(thand);
                    }
                } else {
                    newList.push(thand);
                }
            }
        }
        this.timedHandlers = newList;
        clearTimeout(this._idleTimeout);
        this._proto._onIdle();

        // reactivate the timer only if connected
        if (this.connected) {
            this._idleTimeout = setTimeout(() => this._onIdle(), 100);
        }
    }
}
