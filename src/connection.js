import Handler from './handler.js';
import TimedHandler from './timed-handler.js';
import Builder, { $build, $iq, $pres } from './builder.js';
import log from './log.js';
import { ErrorCondition, NS, Status } from './constants.js';
import SASLAnonymous from './sasl-anon.js';
import SASLExternal from './sasl-external.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import {
    addCookies,
    forEachChild,
    getBareJidFromJid,
    getDomainFromJid,
    getNodeFromJid,
    getResourceFromJid,
    getText,
    handleError,
} from './utils.js';
import { SessionError } from './errors.js';
import Bosh from './bosh.js';
import WorkerWebsocket from './worker-websocket.js';
import Websocket from './websocket.js';

/**
 * @typedef {import("./sasl.js").default} SASLMechanism
 * @typedef {import("./request.js").default} Request
 *
 * @typedef {Object} ConnectionOptions
 * @property {Cookies} [cookies]
 *  Allows you to pass in cookies that will be included in HTTP requests.
 *  Relevant to both the BOSH and Websocket transports.
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
 *  Note that cookies can't be set in this way for domains other than the one
 *  that's hosting Strophe (i.e. cross-domain).
 *  Those cookies need to be set under those domains, for example they can be
 *  set server-side by making a XHR call to that domain to ask it to set any
 *  necessary cookies.
 * @property {SASLMechanism[]} [mechanisms]
 *  Allows you to specify the SASL authentication mechanisms that this
 *  instance of Connection (and therefore your XMPP client) will support.
 *
 *  The value must be an array of objects with {@link SASLMechanism}
 *  prototypes.
 *
 *  If nothing is specified, then the following mechanisms (and their
 *  priorities) are registered:
 *
 *      Mechanism       Priority
 *      ------------------------
 *      SCRAM-SHA-512   72
 *      SCRAM-SHA-384   71
 *      SCRAM-SHA-256   70
 *      SCRAM-SHA-1     60
 *      PLAIN           50
 *      OAUTHBEARER     40
 *      X-OAUTH2        30
 *      ANONYMOUS       20
 *      EXTERNAL        10
 *
 * @property {boolean} [explicitResourceBinding]
 *  If `explicitResourceBinding` is set to `true`, then the XMPP client
 *  needs to explicitly call {@link Connection.bind} once the XMPP
 *  server has advertised the `urn:ietf:propertys:xml:ns:xmpp-bind` feature.
 *
 *  Making this step explicit allows client authors to first finish other
 *  stream related tasks, such as setting up an XEP-0198 Stream Management
 *  session, before binding the JID resource for this session.
 *
 * @property {'ws'|'wss'} [protocol]
 *  _Note: This option is only relevant to Websocket connections, and not BOSH_
 *
 *  If you want to connect to the current host with a WebSocket connection you
 *  can tell Strophe to use WebSockets through the "protocol" option.
 *  Valid values are `ws` for WebSocket and `wss` for Secure WebSocket.
 *  So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
 *
 *      const conn = new Strophe.Connection(
 *          "/xmpp-websocket/",
 *          {protocol: "wss"}
 *      );
 *
 *  Note that relative URLs _NOT_ starting with a "/" will also include the path
 *  of the current site.
 *
 *  Also because downgrading security is not permitted by browsers, when using
 *  relative URLs both BOSH and WebSocket connections will use their secure
 *  variants if the current connection to the site is also secure (https).
 *
 * @property {string} [worker]
 *  _Note: This option is only relevant to Websocket connections, and not BOSH_
 *
 *  Set this option to URL from where the shared worker script should be loaded.
 *
 *  To run the websocket connection inside a shared worker.
 *  This allows you to share a single websocket-based connection between
 *  multiple Connection instances, for example one per browser tab.
 *
 *  The script to use is the one in `src/shared-connection-worker.js`.
 *
 * @property {boolean} [sync]
 *  Used to control whether BOSH HTTP requests will be made synchronously or not.
 *  The default behaviour is asynchronous. If you want to make requests
 *  synchronous, make "sync" evaluate to true.
 *
 *  > const conn = new Strophe.Connection("/http-bind/", {sync: true});
 *
 *  You can also toggle this on an already established connection.
 *
 *  > conn.options.sync = true;
 *
 * @property {string[]} [customHeaders]
 *  Used to provide custom HTTP headers to be included in the BOSH HTTP requests.
 *
 * @property {boolean} [keepalive]
 *  Used to instruct Strophe to maintain the current BOSH session across
 *  interruptions such as webpage reloads.
 *
 *  It will do this by caching the sessions tokens in sessionStorage, and when
 *  "restore" is called it will check whether there are cached tokens with
 *  which it can resume an existing session.
 *
 * @property {boolean} [withCredentials]
 *  Used to indicate wether cookies should be included in HTTP requests (by default
 *  they're not).
 *  Set this value to `true` if you are connecting to a BOSH service
 *  and for some reason need to send cookies to it.
 *  In order for this to work cross-domain, the server must also enable
 *  credentials by setting the `Access-Control-Allow-Credentials` response header
 *  to "true". For most usecases however this setting should be false (which
 *  is the default).
 *  Additionally, when using `Access-Control-Allow-Credentials`, the
 *  `Access-Control-Allow-Origin` header can't be set to the wildcard "*", but
 *  instead must be restricted to actual domains.
 *
 * @property {string} [contentType]
 *  Used to change the default Content-Type, which is "text/xml; charset=utf-8".
 *  Can be useful to reduce the amount of CORS preflight requests that are sent
 *  to the server.
 */


/**
 * _Private_ variable Used to store plugin names that need
 * initialization during Connection construction.
 * @type {Object.<string, Object>}
 */
const connectionPlugins = {};

/**
 * **XMPP Connection manager**
 *
 * This class is the main part of Strophe.  It manages a BOSH or websocket
 * connection to an XMPP server and dispatches events to the user callbacks
 * as data arrives.
 *
 * It supports various authentication mechanisms (e.g. SASL PLAIN, SASL SCRAM),
 * and more can be added via
 * {@link Connection#registerSASLMechanisms|registerSASLMechanisms()}.
 *
 * After creating a Connection object, the user will typically
 * call {@link Connection#connect|connect()} with a user supplied callback
 * to handle connection level events like authentication failure,
 * disconnection, or connection complete.
 *
 * The user will also have several event handlers defined by using
 * {@link Connection#addHandler|addHandler()} and
 * {@link Connection#addTimedHandler|addTimedHandler()}.
 * These will allow the user code to respond to interesting stanzas or do
 * something periodically with the connection. These handlers will be active
 * once authentication is finished.
 *
 * To send data to the connection, use {@link Connection#send|send()}.
 *
 * @memberof Strophe
 */
class Connection {
    /**
     * @typedef {Object.<string, string>} Cookie
     * @typedef {Cookie|Object.<string, Cookie>} Cookies
     */


    /**
     * Create and initialize a {@link Connection} object.
     *
     * The transport-protocol for this connection will be chosen automatically
     * based on the given service parameter. URLs starting with "ws://" or
     * "wss://" will use WebSockets, URLs starting with "http://", "https://"
     * or without a protocol will use [BOSH](https://xmpp.org/extensions/xep-0124.html).
     *
     * To make Strophe connect to the current host you can leave out the protocol
     * and host part and just pass the path:
     *
     *  const conn = new Strophe.Connection("/http-bind/");
     *
     * @param {string} service - The BOSH or WebSocket service URL.
     * @param {ConnectionOptions} options - A object containing configuration options
     */
    constructor(service, options = {}) {
        // The service URL
        this.service = service;
        // Configuration options
        this.options = options;

        this.setProtocol();

        /* The connected JID. */
        this.jid = '';
        /* the JIDs domain */
        this.domain = null;
        /* stream:features */
        this.features = null;

        // SASL
        /**
         * @typedef {Object.<string, any>} SASLData
         * @property {Object} [SASLData.keys]
         */

        /** @type {SASLData} */
        this._sasl_data = {};
        this.do_bind = false;
        this.do_session = false;

        /** @type {Object.<string, SASLMechanism>} */
        this.mechanisms = {};

        /** @type {TimedHandler[]} */
        this.timedHandlers = [];

        /** @type {Handler[]} */
        this.handlers = [];

        /** @type {TimedHandler[]} */
        this.removeTimeds = [];

        /** @type {Handler[]} */
        this.removeHandlers = [];

        /** @type {TimedHandler[]} */
        this.addTimeds = [];

        /** @type {Handler[]} */
        this.addHandlers = [];

        this.protocolErrorHandlers = {
            /** @type {Object.<number, Function>} */
            'HTTP': {},
            /** @type {Object.<number, Function>} */
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

        /** @type {(Element|'restart')[]} */
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
            /**
             * @param {Element} iq
             */
            (iq) =>
                this.send(
                    $iq({ type: 'error', id: iq.getAttribute('id') })
                        .c('error', { 'type': 'cancel' })
                        .c('service-unavailable', { 'xmlns': NS.STANZAS })
                ),
            null,
            'iq',
            ['get', 'set']
        );

        // initialize plugins
        for (const k in connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(connectionPlugins, k)) {
                const F = function () {};
                F.prototype = connectionPlugins[k];
                // @ts-ignore
                this[k] = new F();
                // @ts-ignore
                this[k].init(this);
            }
        }
    }

    /**
     * Extends the Connection object with the given plugin.
     * @param {string} name - The name of the extension.
     * @param {Object} ptype - The plugin's prototype.
     */
    static addConnectionPlugin(name, ptype) {
        connectionPlugins[name] = ptype;
    }

    /**
     * Select protocal based on this.options or this.service
     */
    setProtocol() {
        const proto = this.options.protocol || '';
        if (this.options.worker) {
            this._proto = new WorkerWebsocket(this);
        } else if (
            this.service.indexOf('ws:') === 0 ||
            this.service.indexOf('wss:') === 0 ||
            proto.indexOf('ws') === 0
        ) {
            this._proto = new Websocket(this);
        } else {
            this._proto = new Bosh(this);
        }
    }

    /**
     * Reset the connection.
     *
     * This function should be called after a connection is disconnected
     * before that connection is reused.
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
        /** @type {Request[]} */
        this._requests = [];
        this._uniqueId = 0;
    }

    /**
     * Pause the request manager.
     *
     * This will prevent Strophe from sending any more requests to the
     * server.  This is very useful for temporarily pausing
     * BOSH-Connections while a lot of send() calls are happening quickly.
     * This causes Strophe to send the data in a single request, saving
     * many request trips.
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume the request manager.
     *
     * This resumes after pause() has been called.
     */
    resume() {
        this.paused = false;
    }

    /**
     * Generate a unique ID for use in <iq/> elements.
     *
     * All <iq/> stanzas are required to have unique id attributes.  This
     * function makes creating these easy.  Each connection instance has
     * a counter which starts from zero, and the value of this counter
     * plus a colon followed by the suffix becomes the unique id. If no
     * suffix is supplied, the counter is used as the unique id.
     *
     * Suffixes are used to make debugging easier when reading the stream
     * data, and their use is recommended.  The counter resets to 0 for
     * every new connection for the same reason.  For connections to the
     * same server that authenticate the same way, all the ids should be
     * the same, which makes it easy to see changes.  This is useful for
     * automated testing as well.
     *
     * @param {string} suffix - A optional suffix to append to the id.
     * @returns {string} A unique string to be used for the id attribute.
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

    /**
     * Register a handler function for when a protocol (websocker or HTTP)
     * error occurs.
     *
     * NOTE: Currently only HTTP errors for BOSH requests are handled.
     * Patches that handle websocket errors would be very welcome.
     *
     * @example
     *  function onError(err_code){
     *    //do stuff
     *  }
     *
     *  const conn = Strophe.connect('http://example.com/http-bind');
     *  conn.addProtocolErrorHandler('HTTP', 500, onError);
     *  // Triggers HTTP 500 error and onError handler will be called
     *  conn.connect('user_jid@incorrect_jabber_host', 'secret', onConnect);
     *
     * @param {'HTTP'|'websocket'} protocol - 'HTTP' or 'websocket'
     * @param {number} status_code - Error status code (e.g 500, 400 or 404)
     * @param {Function} callback - Function that will fire on Http error
     */
    addProtocolErrorHandler(protocol, status_code, callback) {
        this.protocolErrorHandlers[protocol][status_code] = callback;
    }

    /**
     * @typedef {Object} Password
     * @property {string} Password.name
     * @property {string} Password.ck
     * @property {string} Password.sk
     * @property {number} Password.iter
     * @property {string} Password.salt
     */

    /**
     * Starts the connection process.
     *
     * As the connection process proceeds, the user supplied callback will
     * be triggered multiple times with status updates.  The callback
     * should take two arguments - the status code and the error condition.
     *
     * The status code will be one of the values in the Strophe.Status
     * constants.  The error condition will be one of the conditions
     * defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     * The Parameters _wait_, _hold_ and _route_ are optional and only relevant
     * for BOSH connections. Please see XEP 124 for a more detailed explanation
     * of the optional parameters.
     *
     * @param {string} jid - The user's JID.  This may be a bare JID,
     *     or a full JID.  If a node is not supplied, SASL OAUTHBEARER or
     *     SASL ANONYMOUS authentication will be attempted (OAUTHBEARER will
     *     process the provided password value as an access token).
     *   (String or Object) pass - The user's password, or an object containing
     *     the users SCRAM client and server keys, in a fashion described as follows:
     *
     *     { name: String, representing the hash used (eg. SHA-1),
     *       salt: String, base64 encoded salt used to derive the client key,
     *       iter: Int,    the iteration count used to derive the client key,
     *       ck:   String, the base64 encoding of the SCRAM client key
     *       sk:   String, the base64 encoding of the SCRAM server key
     *     }
     * @param {string|Password} pass - The user password
     * @param {Function} callback - The connect callback function.
     * @param {number} [wait] - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     * @param {number} [hold] - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {string} [route] - The optional route value.
     * @param {string} [authcid] - The optional alternative authentication identity
     *     (username) if intending to impersonate another user.
     *     When using the SASL-EXTERNAL authentication mechanism, for example
     *     with client certificates, then the authcid value is used to
     *     determine whether an authorization JID (authzid) should be sent to
     *     the server. The authzid should NOT be sent to the server if the
     *     authzid and authcid are the same. So to prevent it from being sent
     *     (for example when the JID is already contained in the client
     *     certificate), set authcid to that same JID. See XEP-178 for more
     *     details.
     *  @param {number} [disconnection_timeout=3000] - The optional disconnection timeout
     *     in milliseconds before _doDisconnect will be called.
     */
    connect(jid, pass, callback, wait, hold, route, authcid, disconnection_timeout = 3000) {
        this.jid = jid;
        /** Authorization identity */
        this.authzid = getBareJidFromJid(this.jid);
        /** Authentication identity (User name) */
        this.authcid = authcid || getNodeFromJid(this.jid);
        /** Authentication identity (User password) */
        this.pass = pass;

        /**
         * The SASL SCRAM client and server keys. This variable will be populated with a non-null
         * object of the above described form after a successful SCRAM connection
         */
        this.scram_keys = null;

        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.restored = false;
        this.disconnection_timeout = disconnection_timeout;

        // parse jid for domain
        this.domain = getDomainFromJid(this.jid);

        this._changeConnectStatus(Status.CONNECTING, null);

        this._proto._connect(wait, hold, route);
    }

    /**
     * Attach to an already created and authenticated BOSH session.
     *
     * This function is provided to allow Strophe to attach to BOSH
     * sessions which have been created externally, perhaps by a Web
     * application.  This is often used to support auto-login type features
     * without putting user credentials into the page.
     *
     * @param {string|Function} jid - The full JID that is bound by the session.
     * @param {string} [sid] - The SID of the BOSH session.
     * @param {number} [rid] - The current RID of the BOSH session.  This RID
     *     will be used by the next request.
     * @param {Function} [callback] - The connect callback function.
     * @param {number} [wait] - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     *     Other settings will require tweaks to the Strophe.TIMEOUT value.
     * @param {number} [hold] - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {number} [wind] - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    attach(jid, sid, rid, callback, wait, hold, wind) {
        if (this._proto instanceof Bosh && typeof jid === 'string') {
            return this._proto._attach(jid, sid, rid, callback, wait, hold, wind);
        } else if (this._proto instanceof WorkerWebsocket && typeof jid === 'function') {
            const callback = jid;
            return this._proto._attach(callback);
        } else {
            throw new SessionError('The "attach" method is not available for your connection protocol');
        }
    }

    /**
     * Attempt to restore a cached BOSH session.
     *
     * This function is only useful in conjunction with providing the
     * "keepalive":true option when instantiating a new {@link Connection}.
     *
     * When "keepalive" is set to true, Strophe will cache the BOSH tokens
     * RID (Request ID) and SID (Session ID) and then when this function is
     * called, it will attempt to restore the session from those cached
     * tokens.
     *
     * This function must therefore be called instead of connect or attach.
     *
     * For an example on how to use it, please see examples/restore.js
     *
     * @param {string} jid - The user's JID.  This may be a bare JID or a full JID.
     * @param {Function} callback - The connect callback function.
     * @param {number} [wait] - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     * @param {number} [hold] - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param {number} [wind] - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    restore(jid, callback, wait, hold, wind) {
        if (!(this._proto instanceof Bosh) || !this._sessionCachingSupported()) {
            throw new SessionError('The "restore" method can only be used with a BOSH connection.');
        }

        if (this._sessionCachingSupported()) {
            this._proto._restore(jid, callback, wait, hold, wind);
        }
    }

    /**
     * Checks whether sessionStorage and JSON are supported and whether we're
     * using BOSH.
     */
    _sessionCachingSupported() {
        if (this._proto instanceof Bosh) {
            if (!JSON) {
                return false;
            }
            try {
                sessionStorage.setItem('_strophe_', '_strophe_');
                sessionStorage.removeItem('_strophe_');
            } catch (e) { // eslint-disable-line no-unused-vars
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * User overrideable function that receives XML data coming into the
     * connection.
     *
     * The default function does nothing.  User code can override this with
     * > Connection.xmlInput = function (elem) {
     * >   (user code)
     * > };
     *
     * Due to limitations of current Browsers' XML-Parsers the opening and closing
     * <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     * BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     * <Bosh.strip> if you want to strip this tag.
     *
     * @param {Node|MessageEvent} elem - The XML data received by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    xmlInput(elem) {
        return;
    }

    /**
     * User overrideable function that receives XML data sent to the
     * connection.
     *
     * The default function does nothing.  User code can override this with
     * > Connection.xmlOutput = function (elem) {
     * >   (user code)
     * > };
     *
     * Due to limitations of current Browsers' XML-Parsers the opening and closing
     * <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     * BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     * <Bosh.strip> if you want to strip this tag.
     *
     * @param {Element} elem - The XMLdata sent by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    xmlOutput(elem) {
        return;
    }

    /**
     * User overrideable function that receives raw data coming into the
     * connection.
     *
     * The default function does nothing.  User code can override this with
     * > Connection.rawInput = function (data) {
     * >   (user code)
     * > };
     *
     * @param {string} data - The data received by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    rawInput(data) {
        return;
    }

    /**
     * User overrideable function that receives raw data sent to the
     * connection.
     *
     * The default function does nothing.  User code can override this with
     * > Connection.rawOutput = function (data) {
     * >   (user code)
     * > };
     *
     * @param {string} data - The data sent by the connection.
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    rawOutput(data) {
        return;
    }

    /**
     * User overrideable function that receives the new valid rid.
     *
     * The default function does nothing. User code can override this with
     * > Connection.nextValidRid = function (rid) {
     * >    (user code)
     * > };
     *
     * @param {number} rid - The next valid rid
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    nextValidRid(rid) {
        return;
    }

    /**
     * Send a stanza.
     *
     * This function is called to push data onto the send queue to
     * go out over the wire.  Whenever a request is sent to the BOSH
     * server, all pending data is sent and the queue is flushed.
     *
     * @param {Element|Builder|Element[]|Builder[]} stanza - The stanza to send
     */
    send(stanza) {
        if (stanza === null) return;

        if (Array.isArray(stanza)) {
            stanza.forEach((s) => this._queueData(s instanceof Builder ? s.tree() : s));
        } else {
            const el = stanza instanceof Builder ? stanza.tree() : stanza;
            this._queueData(el);
        }
        this._proto._send();
    }

    /**
     * Immediately send any pending outgoing data.
     *
     * Normally send() queues outgoing data until the next idle period
     * (100ms), which optimizes network use in the common cases when
     * several send()s are called in succession. flush() can be used to
     * immediately send all pending data.
     */
    flush() {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    }

    /**
     * Helper function to send presence stanzas. The main benefit is for
     * sending presence stanzas for which you expect a responding presence
     * stanza with the same id (for example when leaving a chat room).
     *
     * @param {Element} stanza - The stanza to send.
     * @param {Function} [callback] - The callback function for a successful request.
     * @param {Function} [errback] - The callback function for a failed or timed
     *    out request.  On timeout, the stanza will be null.
     * @param {number} [timeout] - The time specified in milliseconds for a
     *    timeout to occur.
     * @return {string} The id used to send the presence.
     */
    sendPresence(stanza, callback, errback, timeout) {
        /** @type {TimedHandler} */
        let timeoutHandler = null;

        const el = stanza instanceof Builder ? stanza.tree() : stanza;

        let id = el.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendPresence');
            el.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                /** @param {Element} stanza */
                (stanza) => {
                    // remove timeout handler if there is one
                    if (timeoutHandler) this.deleteTimedHandler(timeoutHandler);

                    if (stanza.getAttribute('type') === 'error') {
                        errback?.(stanza);
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
                    errback?.(null);
                    return false;
                });
            }
        }
        this.send(el);
        return id;
    }

    /**
     * Helper function to send IQ stanzas.
     *
     * @param {Element|Builder} stanza - The stanza to send.
     * @param {Function} [callback] - The callback function for a successful request.
     * @param {Function} [errback] - The callback function for a failed or timed
     *     out request.  On timeout, the stanza will be null.
     * @param {number} [timeout] - The time specified in milliseconds for a
     *     timeout to occur.
     * @return {string} The id used to send the IQ.
     */
    sendIQ(stanza, callback, errback, timeout) {
        /** @type {TimedHandler} */
        let timeoutHandler = null;

        const el = stanza instanceof Builder ? stanza.tree() : stanza;

        let id = el.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendIQ');
            el.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                /** @param {Element} stanza */
                (stanza) => {
                    // remove timeout handler if there is one
                    if (timeoutHandler) this.deleteTimedHandler(timeoutHandler);

                    const iqtype = stanza.getAttribute('type');
                    if (iqtype === 'result') {
                        callback?.(stanza);
                    } else if (iqtype === 'error') {
                        errback?.(stanza);
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
                    errback?.(null);
                    return false;
                });
            }
        }
        this.send(el);
        return id;
    }

    /**
     * Queue outgoing data for later sending.  Also ensures that the data
     * is a DOMElement.
     * @private
     * @param {Element} element
     */
    _queueData(element) {
        if (element === null || !element.tagName || !element.childNodes) {
            const error = new Error('Cannot queue non-DOMElement.');
            error.name = 'StropheError';
            throw error;
        }
        this._data.push(element);
    }

    /**
     * Send an xmpp:restart stanza.
     * @private
     */
    _sendRestart() {
        this._data.push('restart');
        this._proto._sendRestart();
        this._idleTimeout = setTimeout(() => this._onIdle(), 100);
    }

    /**
     * Add a timed handler to the connection.
     *
     * This function adds a timed handler.  The provided handler will
     * be called every period milliseconds until it returns false,
     * the connection is terminated, or the handler is removed.  Handlers
     * that wish to continue being invoked should return true.
     *
     * Because of method binding it is necessary to save the result of
     * this function if you wish to remove a handler with
     * deleteTimedHandler().
     *
     * Note that user handlers are not active until authentication is
     * successful.
     *
     * @param {number} period - The period of the handler.
     * @param {Function} handler - The callback function.
     * @return {TimedHandler} A reference to the handler that can be used to remove it.
     */
    addTimedHandler(period, handler) {
        const thand = new TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    }

    /**
     * Delete a timed handler for a connection.
     *
     * This function removes a timed handler from the connection.  The
     * handRef parameter is *not* the function passed to addTimedHandler(),
     * but is the reference returned from addTimedHandler().
     * @param {TimedHandler} handRef - The handler reference.
     */
    deleteTimedHandler(handRef) {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    }

    /**
     * @typedef {Object} HandlerOptions
     * @property {boolean} [HandlerOptions.matchBareFromJid]
     * @property {boolean} [HandlerOptions.ignoreNamespaceFragment]
     */

    /**
     * Add a stanza handler for the connection.
     *
     * This function adds a stanza handler to the connection.  The
     * handler callback will be called for any stanza that matches
     * the parameters.  Note that if multiple parameters are supplied,
     * they must all match for the handler to be invoked.
     *
     * The handler will receive the stanza that triggered it as its argument.
     * *The handler should return true if it is to be invoked again;
     * returning false will remove the handler after it returns.*
     *
     * As a convenience, the ns parameters applies to the top level element
     * and also any of its immediate children.  This is primarily to make
     * matching /iq/query elements easy.
     *
     * ### Options
     *
     * With the options argument, you can specify boolean flags that affect how
     * matches are being done.
     *
     * Currently two flags exist:
     *
     * * *matchBareFromJid*:
     *     When set to true, the from parameter and the
     *     from attribute on the stanza will be matched as bare JIDs instead
     *     of full JIDs. To use this, pass {matchBareFromJid: true} as the
     *     value of options. The default value for matchBareFromJid is false.
     *
     * * *ignoreNamespaceFragment*:
     *     When set to true, a fragment specified on the stanza's namespace
     *     URL will be ignored when it's matched with the one configured for
     *     the handler.
     *
     *     This means that if you register like this:
     *
     *     >   connection.addHandler(
     *     >       handler,
     *     >       'http://jabber.org/protocol/muc',
     *     >       null, null, null, null,
     *     >       {'ignoreNamespaceFragment': true}
     *     >   );
     *
     *     Then a stanza with XML namespace of
     *     'http://jabber.org/protocol/muc#user' will also be matched. If
     *     'ignoreNamespaceFragment' is false, then only stanzas with
     *     'http://jabber.org/protocol/muc' will be matched.
     *
     * ### Deleting the handler
     *
     * The return value should be saved if you wish to remove the handler
     * with `deleteHandler()`.
     *
     * @param {Function} handler - The user callback.
     * @param {string} ns - The namespace to match.
     * @param {string} name - The stanza name to match.
     * @param {string|string[]} type - The stanza type (or types if an array) to match.
     * @param {string} [id] - The stanza id attribute to match.
     * @param {string} [from] - The stanza from attribute to match.
     * @param {HandlerOptions} [options] - The handler options
     * @return {Handler} A reference to the handler that can be used to remove it.
     */
    addHandler(handler, ns, name, type, id, from, options) {
        const hand = new Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    }

    /**
     * Delete a stanza handler for a connection.
     *
     * This function removes a stanza handler from the connection.  The
     * handRef parameter is *not* the function passed to addHandler(),
     * but is the reference returned from addHandler().
     *
     * @param {Handler} handRef - The handler reference.
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

    /**
     * Register the SASL mechanisms which will be supported by this instance of
     * Connection (i.e. which this XMPP client will support).
     * @param {SASLMechanism[]} mechanisms - Array of objects with SASLMechanism prototypes
     */
    registerSASLMechanisms(mechanisms) {
        this.mechanisms = {};
        (
            mechanisms || [
                SASLAnonymous,
                SASLExternal,
                SASLOAuthBearer,
                SASLXOAuth2,
                SASLPlain,
                SASLSHA1,
                SASLSHA256,
                SASLSHA384,
                SASLSHA512,
            ]
        ).forEach((m) => this.registerSASLMechanism(m));
    }

    /**
     * Register a single SASL mechanism, to be supported by this client.
     * @param {any} Mechanism - Object with a Strophe.SASLMechanism prototype
     */
    registerSASLMechanism(Mechanism) {
        const mechanism = new Mechanism();
        this.mechanisms[mechanism.mechname] = mechanism;
    }

    /**
     * Start the graceful disconnection process.
     *
     * This function starts the disconnection process.  This process starts
     * by sending unavailable presence and sending BOSH body of type
     * terminate.  A timeout handler makes sure that disconnection happens
     * even if the BOSH server does not respond.
     * If the Connection object isn't connected, at least tries to abort all pending requests
     * so the connection object won't generate successful requests (which were already opened).
     *
     * The user supplied connection callback will be notified of the
     * progress as this process happens.
     *
     * @param {string} [reason] - The reason the disconnect is occuring.
     */
    disconnect(reason) {
        this._changeConnectStatus(Status.DISCONNECTING, reason);
        if (reason) {
            log.info('Disconnect was called because: ' + reason);
        } else {
            log.debug('Disconnect was called');
        }
        if (this.connected) {
            let pres = null;
            this.disconnecting = true;
            if (this.authenticated) {
                pres = $pres({
                    'xmlns': NS.CLIENT,
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
            log.debug('Disconnect was called before Strophe connected to the server');
            this._proto._abortAllRequests();
            this._doDisconnect();
        }
    }

    /**
     * _Private_ helper function that makes sure plugins and the user's
     * callback are notified of connection status changes.
     * @param {number} status - the new connection status, one of the values
     *     in Strophe.Status
     * @param {string|null} [condition] - the error condition
     * @param {Element} [elem] - The triggering stanza.
     */
    _changeConnectStatus(status, condition, elem) {
        // notify all plugins listening for status changes
        for (const k in connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(connectionPlugins, k)) {
                // @ts-ignore
                const plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        log.error(`${k} plugin caused an exception changing status: ${err}`);
                    }
                }
            }
        }
        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition, elem);
            } catch (e) {
                handleError(e);
                log.error(`User connection callback caused an exception: ${e}`);
            }
        }
    }

    /**
     * _Private_ function to disconnect.
     *
     * This is the last piece of the disconnection logic.  This resets the
     * connection and alerts the user's connection callback.
     * @param {string|null} [condition] - the error condition
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

        log.debug('_doDisconnect was called');
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

    /**
     * _Private_ handler to processes incoming data from the the connection.
     *
     * Except for _connect_cb handling the initial connection request,
     * this function handles the incoming data for all requests.  This
     * function also fires stanza handlers that match each incoming
     * stanza.
     * @param {Element | Request} req - The request that has data ready.
     * @param {string} [raw] - The stanza as raw string.
     */
    _dataRecv(req, raw) {
        const elem = /** @type {Element} */ (
            '_reqToData' in this._proto ? this._proto._reqToData(/** @type {Request} */ (req)) : req
        );
        if (elem === null) {
            return;
        }

        if (this.xmlInput !== Connection.prototype.xmlInput) {
            if (elem.nodeName === this._proto.strip && elem.childNodes.length) {
                this.xmlInput(elem.childNodes[0]);
            } else {
                this.xmlInput(elem);
            }
        }
        if (this.rawInput !== Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Builder.serialize(elem));
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
                this._changeConnectStatus(Status.CONNFAIL, ErrorCondition.UNKNOWN_REASON);
            }
            this._doDisconnect(cond);
            return;
        }

        // send each incoming stanza through the handler chain
        forEachChild(
            elem,
            null,
            /** @param {Element} child */
            (child) => {
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
                        log.warn('Removing Strophe handlers due to uncaught exception: ' + e.message);
                    }

                    return handlers;
                }, []);

                // If no handler was fired for an incoming IQ with type="set",
                // then we return an IQ error stanza with service-unavailable.
                if (!matches.length && this.iqFallbackHandler.isMatch(child)) {
                    this.iqFallbackHandler.run(child);
                }
            }
        );
    }

    /**
     * @callback connectionCallback
     * @param {Connection} connection
     */

    /**
     * _Private_ handler for initial connection request.
     *
     * This handler is used to process the initial connection request
     * response from the BOSH server. It is used to set up authentication
     * handlers and start the authentication process.
     *
     * SASL authentication will be attempted if available, otherwise
     * the code will fall back to legacy authentication.
     *
     * @param {Element | Request} req - The current request.
     * @param {connectionCallback} _callback - low level (xmpp) connect callback function.
     *     Useful for plugins with their own xmpp connect callback (when they
     *     want to do something special).
     * @param {string} [raw] - The stanza as raw string.
     */
    _connect_cb(req, _callback, raw) {
        log.debug('_connect_cb was called');
        this.connected = true;

        let bodyWrap;
        try {
            bodyWrap = /** @type {Element} */ (
                '_reqToData' in this._proto ? this._proto._reqToData(/** @type {Request} */ (req)) : req
            );
        } catch (e) {
            if (e.name !== ErrorCondition.BAD_FORMAT) {
                throw e;
            }
            this._changeConnectStatus(Status.CONNFAIL, ErrorCondition.BAD_FORMAT);
            this._doDisconnect(ErrorCondition.BAD_FORMAT);
        }
        if (!bodyWrap) {
            return;
        }

        if (this.xmlInput !== Connection.prototype.xmlInput) {
            if (bodyWrap.nodeName === this._proto.strip && bodyWrap.childNodes.length) {
                this.xmlInput(bodyWrap.childNodes[0]);
            } else {
                this.xmlInput(bodyWrap);
            }
        }
        if (this.rawInput !== Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Builder.serialize(bodyWrap));
            }
        }

        const conncheck = this._proto._connect_cb(bodyWrap);
        if (conncheck === Status.CONNFAIL) {
            return;
        }

        // Check for the stream:features tag
        let hasFeatures;
        if (bodyWrap.getElementsByTagNameNS) {
            hasFeatures = bodyWrap.getElementsByTagNameNS(NS.STREAM, 'features').length > 0;
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

    /**
     * Sorts an array of objects with prototype SASLMechanism according to
     * their priorities.
     * @param {SASLMechanism[]} mechanisms - Array of SASL mechanisms.
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

    /**
     * Set up authentication
     *
     * Continues the initial connection request by setting up authentication
     * handlers and starting the authentication process.
     *
     * SASL authentication will be attempted if available, otherwise
     * the code will fall back to legacy authentication.
     *
     * @param {SASLMechanism[]} matched - Array of SASL mechanisms supported.
     */
    authenticate(matched) {
        if (!this._attemptSASLAuth(matched)) {
            this._attemptLegacyAuth();
        }
    }

    /**
     * Iterate through an array of SASL mechanisms and attempt authentication
     * with the highest priority (enabled) mechanism.
     *
     * @private
     * @param {SASLMechanism[]} mechanisms - Array of SASL mechanisms.
     * @return {Boolean} mechanism_found - true or false, depending on whether a
     *  valid SASL mechanism was found with which authentication could be started.
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
                'xmlns': NS.SASL,
                'mechanism': this._sasl_mechanism.mechname,
            });
            if (this._sasl_mechanism.isClientFirst) {
                const response = this._sasl_mechanism.clientChallenge(this);
                request_auth_exchange.t(btoa(/** @type {string} */ (response)));
            }
            this.send(request_auth_exchange.tree());
            mechanism_found = true;
            break;
        }
        return mechanism_found;
    }

    /**
     * _Private_ handler for the SASL challenge
     * @private
     * @param {Element} elem
     */
    async _sasl_challenge_cb(elem) {
        const challenge = atob(getText(elem));
        const response = await this._sasl_mechanism.onChallenge(this, challenge);
        const stanza = $build('response', { 'xmlns': NS.SASL });
        if (response) stanza.t(btoa(response));
        this.send(stanza.tree());
        return true;
    }

    /**
     * Attempt legacy (i.e. non-SASL) authentication.
     * @private
     */
    _attemptLegacyAuth() {
        if (getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(Status.CONNFAIL, ErrorCondition.MISSING_JID_NODE);
            this.disconnect(ErrorCondition.MISSING_JID_NODE);
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
                    .c('query', { xmlns: NS.AUTH })
                    .c('username', {})
                    .t(getNodeFromJid(this.jid))
                    .tree()
            );
        }
    }

    /**
     * _Private_ handler for legacy authentication.
     *
     * This handler is called in response to the initial <iq type='get'/>
     * for legacy authentication.  It builds an authentication <iq/> and
     * sends it, creating a handler (calling back to _auth2_cb()) to
     * handle the result
     * @private
     * @return {false} `false` to remove the handler.
     */
    _onLegacyAuthIQResult() {
        const pass = typeof this.pass === 'string' ? this.pass : '';

        // build plaintext auth iq
        const iq = $iq({ type: 'set', id: '_auth_2' })
            .c('query', { xmlns: NS.AUTH })
            .c('username', {})
            .t(getNodeFromJid(this.jid))
            .up()
            .c('password')
            .t(pass);

        if (!getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null, null, null, '_auth_2');
        this.send(iq.tree());
        return false;
    }

    /**
     * _Private_ handler for succesful SASL authentication.
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
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
        log.info('SASL authentication succeeded.');

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
        /** @type {Handler[]} */
        const streamfeature_handlers = [];

        /**
         * @param {Handler[]} handlers
         * @param {Element} elem
         */
        const wrapper = (handlers, elem) => {
            while (handlers.length) {
                this.deleteHandler(handlers.pop());
            }
            this._onStreamFeaturesAfterSASL(elem);
            return false;
        };

        streamfeature_handlers.push(
            this._addSysHandler(
                /** @param {Element} elem */
                (elem) => wrapper(streamfeature_handlers, elem),
                null,
                'stream:features',
                null,
                null
            )
        );

        streamfeature_handlers.push(
            this._addSysHandler(
                /** @param {Element} elem */
                (elem) => wrapper(streamfeature_handlers, elem),
                NS.STREAM,
                'features',
                null,
                null
            )
        );

        // we must send an xmpp:restart now
        this._sendRestart();
        return false;
    }

    /**
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
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

    /**
     * Sends an IQ to the XMPP server to bind a JID resource for this session.
     *
     * https://tools.ietf.org/html/rfc6120#section-7.5
     *
     * If `explicitResourceBinding` was set to a truthy value in the options
     * passed to the Connection constructor, then this function needs
     * to be called explicitly by the client author.
     *
     * Otherwise it'll be called automatically as soon as the XMPP server
     * advertises the "urn:ietf:params:xml:ns:xmpp-bind" stream feature.
     */
    bind() {
        if (!this.do_bind) {
            log.info(`Connection.prototype.bind called but "do_bind" is false`);
            return;
        }
        this._addSysHandler(this._onResourceBindResultIQ.bind(this), null, null, null, '_bind_auth_2');

        const resource = getResourceFromJid(this.jid);
        if (resource) {
            this.send(
                $iq({ type: 'set', id: '_bind_auth_2' })
                    .c('bind', { xmlns: NS.BIND })
                    .c('resource', {})
                    .t(resource)
                    .tree()
            );
        } else {
            this.send($iq({ type: 'set', id: '_bind_auth_2' }).c('bind', { xmlns: NS.BIND }).tree());
        }
    }

    /**
     * _Private_ handler for binding result and session start.
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    _onResourceBindResultIQ(elem) {
        if (elem.getAttribute('type') === 'error') {
            log.warn('Resource binding failed.');
            const conflict = elem.getElementsByTagName('conflict');
            let condition;
            if (conflict.length > 0) {
                condition = ErrorCondition.CONFLICT;
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
            log.warn('Resource binding failed.');
            this._changeConnectStatus(Status.AUTHFAIL, null, elem);
            return false;
        }
    }

    /**
     * Send IQ request to establish a session with the XMPP server.
     *
     * See https://xmpp.org/rfcs/rfc3921.html#session
     *
     * Note: The protocol for session establishment has been determined as
     * unnecessary and removed in RFC-6121.
     * @private
     */
    _establishSession() {
        if (!this.do_session) {
            throw new Error(
                `Connection.prototype._establishSession ` +
                    `called but apparently ${NS.SESSION} wasn't advertised by the server`
            );
        }
        this._addSysHandler(this._onSessionResultIQ.bind(this), null, null, null, '_session_auth_2');

        this.send($iq({ type: 'set', id: '_session_auth_2' }).c('session', { xmlns: NS.SESSION }).tree());
    }

    /**
     * _Private_ handler for the server's IQ response to a client's session
     * request.
     *
     * This sets Connection.authenticated to true on success, which
     * starts the processing of user handlers.
     *
     * See https://xmpp.org/rfcs/rfc3921.html#session
     *
     * Note: The protocol for session establishment has been determined as
     * unnecessary and removed in RFC-6121.
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    _onSessionResultIQ(elem) {
        if (elem.getAttribute('type') === 'result') {
            this.authenticated = true;
            this._changeConnectStatus(Status.CONNECTED, null);
        } else if (elem.getAttribute('type') === 'error') {
            this.authenticated = false;
            log.warn('Session creation failed.');
            this._changeConnectStatus(Status.AUTHFAIL, null, elem);
            return false;
        }
        return false;
    }

    /**
     * _Private_ handler for SASL authentication failure.
     * @param {Element} [elem] - The matching stanza.
     * @return {false} `false` to remove the handler.
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

    /**
     * _Private_ handler to finish legacy authentication.
     *
     * This handler is called when the result from the jabber:iq:auth
     * <iq/> stanza is returned.
     * @private
     * @param {Element} elem - The stanza that triggered the callback.
     * @return {false} `false` to remove the handler.
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

    /**
     * _Private_ function to add a system level timed handler.
     *
     * This function is used to add a TimedHandler for the
     * library code.  System timed handlers are allowed to run before
     * authentication is complete.
     * @param {number} period - The period of the handler.
     * @param {Function} handler - The callback function.
     */
    _addSysTimedHandler(period, handler) {
        const thand = new TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    }

    /**
     * _Private_ function to add a system level stanza handler.
     *
     * This function is used to add a Handler for the
     * library code.  System stanza handlers are allowed to run before
     * authentication is complete.
     * @param {Function} handler - The callback function.
     * @param {string} ns - The namespace to match.
     * @param {string} name - The stanza name to match.
     * @param {string} type - The stanza type attribute to match.
     * @param {string} id - The stanza id attribute to match.
     */
    _addSysHandler(handler, ns, name, type, id) {
        const hand = new Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    }

    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     *
     * If the graceful disconnect process does not complete within the
     * time allotted, this handler finishes the disconnect anyway.
     * @return {false} `false` to remove the handler.
     */
    _onDisconnectTimeout() {
        log.debug('_onDisconnectTimeout was called');
        this._changeConnectStatus(Status.CONNTIMEOUT, null);
        this._proto._onDisconnectTimeout();
        // actually disconnect
        this._doDisconnect();
        return false;
    }

    /**
     * _Private_ handler to process events during idle cycle.
     *
     * This handler is called every 100ms to fire timed handlers that
     * are ready and keep poll requests going.
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

export default Connection;
