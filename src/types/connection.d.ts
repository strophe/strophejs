export default Connection;
export type SASLMechanism = import("./sasl.js").default;
export type Request = import("./request.js").default;
/**
 * @typedef {import("./sasl.js").default} SASLMechanism
 * @typedef {import("./request.js").default} Request
 */
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
declare class Connection {
    /**
     * Extends the Connection object with the given plugin.
     * @param {string} name - The name of the extension.
     * @param {Object} ptype - The plugin's prototype.
     */
    static addConnectionPlugin(name: string, ptype: Object): void;
    /**
     * @typedef {Object.<string, string>} Cookie
     * @typedef {Cookie|Object.<string, Cookie>} Cookies
     */
    /**
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
    constructor(service: string, options?: {
        /**
         * Allows you to pass in cookies that will be included in HTTP requests.
         * Relevant to both the BOSH and Websocket transports.
         *
         * The passed in value must be a map of cookie names and string values.
         *
         * > { "myCookie": {
         * >     "value": "1234",
         * >     "domain": ".example.org",
         * >     "path": "/",
         * >     "expires": expirationDate
         * >     }
         * > }
         *
         * Note that cookies can't be set in this way for domains other than the one
         * that's hosting Strophe (i.e. cross-domain).
         * Those cookies need to be set under those domains, for example they can be
         * set server-side by making a XHR call to that domain to ask it to set any
         * necessary cookies.
         */
        cookies?: {
            [x: string]: string;
        } | {
            [x: string]: {
                [x: string]: string;
            };
        };
        /**
         * Allows you to specify the SASL authentication mechanisms that this
         * instance of Connection (and therefore your XMPP client) will support.
         *
         * The value must be an array of objects with {@link SASLMechanism}prototypes.
         *
         * If nothing is specified, then the following mechanisms (and their
         * priorities) are registered:
         *
         * Mechanism       Priority
         * ------------------------
         * SCRAM-SHA-512   72
         * SCRAM-SHA-384   71
         * SCRAM-SHA-256   70
         * SCRAM-SHA-1     60
         * PLAIN           50
         * OAUTHBEARER     40
         * X-OAUTH2        30
         * ANONYMOUS       20
         * EXTERNAL        10
         */
        mechanisms?: SASLMechanism[];
        /**
         * If `explicitResourceBinding` is set to `true`, then the XMPP client
         * needs to explicitly call {@link Connection.bind} once the XMPP
         * server has advertised the `urn:ietf:propertys:xml:ns:xmpp-bind` feature.
         *
         * Making this step explicit allows client authors to first finish other
         * stream related tasks, such as setting up an XEP-0198 Stream Management
         * session, before binding the JID resource for this session.
         */
        explicitResourceBinding?: boolean;
        /**
         * _Note: This option is only relevant to Websocket connections, and not BOSH_
         *
         * If you want to connect to the current host with a WebSocket connection you
         * can tell Strophe to use WebSockets through the "protocol" option.
         * Valid values are `ws` for WebSocket and `wss` for Secure WebSocket.
         * So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
         *
         * const conn = new Strophe.Connection(
         * "/xmpp-websocket/",
         * {protocol: "wss"}
         * );
         *
         * Note that relative URLs _NOT_ starting with a "/" will also include the path
         * of the current site.
         *
         * Also because downgrading security is not permitted by browsers, when using
         * relative URLs both BOSH and WebSocket connections will use their secure
         * variants if the current connection to the site is also secure (https).
         */
        protocol?: "ws" | "wss";
        /**
         * _Note: This option is only relevant to Websocket connections, and not BOSH_
         *
         * Set this option to URL from where the shared worker script should be loaded.
         *
         * To run the websocket connection inside a shared worker.
         * This allows you to share a single websocket-based connection between
         * multiple Connection instances, for example one per browser tab.
         *
         * The script to use is the one in `src/shared-connection-worker.js`.
         */
        worker?: string;
        /**
         * Used to control whether BOSH HTTP requests will be made synchronously or not.
         * The default behaviour is asynchronous. If you want to make requests
         * synchronous, make "sync" evaluate to true.
         *
         * > const conn = new Strophe.Connection("/http-bind/", {sync: true});
         *
         * You can also toggle this on an already established connection.
         *
         * > conn.options.sync = true;
         */
        sync?: boolean;
        /**
         * Used to provide custom HTTP headers to be included in the BOSH HTTP requests.
         */
        customHeaders?: string[];
        /**
         * Used to instruct Strophe to maintain the current BOSH session across
         * interruptions such as webpage reloads.
         *
         * It will do this by caching the sessions tokens in sessionStorage, and when
         * "restore" is called it will check whether there are cached tokens with
         * which it can resume an existing session.
         */
        keepalive?: boolean;
        /**
         * Used to indicate wether cookies should be included in HTTP requests (by default
         * they're not).
         * Set this value to `true` if you are connecting to a BOSH service
         * and for some reason need to send cookies to it.
         * In order for this to work cross-domain, the server must also enable
         * credentials by setting the `Access-Control-Allow-Credentials` response header
         * to "true". For most usecases however this setting should be false (which
         * is the default).
         * Additionally, when using `Access-Control-Allow-Credentials`, the
         * `Access-Control-Allow-Origin` header can't be set to the wildcard "*", but
         * instead must be restricted to actual domains.
         */
        withCredentials?: boolean;
        /**
         * Used to change the default Content-Type, which is "text/xml; charset=utf-8".
         * Can be useful to reduce the amount of CORS preflight requests that are sent
         * to the server.
         */
        contentType?: string;
    });
    service: string;
    options: {
        /**
         * Allows you to pass in cookies that will be included in HTTP requests.
         * Relevant to both the BOSH and Websocket transports.
         *
         * The passed in value must be a map of cookie names and string values.
         *
         * > { "myCookie": {
         * >     "value": "1234",
         * >     "domain": ".example.org",
         * >     "path": "/",
         * >     "expires": expirationDate
         * >     }
         * > }
         *
         * Note that cookies can't be set in this way for domains other than the one
         * that's hosting Strophe (i.e. cross-domain).
         * Those cookies need to be set under those domains, for example they can be
         * set server-side by making a XHR call to that domain to ask it to set any
         * necessary cookies.
         */
        cookies?: {
            [x: string]: string;
        } | {
            [x: string]: {
                [x: string]: string;
            };
        };
        /**
         * Allows you to specify the SASL authentication mechanisms that this
         * instance of Connection (and therefore your XMPP client) will support.
         *
         * The value must be an array of objects with {@link SASLMechanism}prototypes.
         *
         * If nothing is specified, then the following mechanisms (and their
         * priorities) are registered:
         *
         * Mechanism       Priority
         * ------------------------
         * SCRAM-SHA-512   72
         * SCRAM-SHA-384   71
         * SCRAM-SHA-256   70
         * SCRAM-SHA-1     60
         * PLAIN           50
         * OAUTHBEARER     40
         * X-OAUTH2        30
         * ANONYMOUS       20
         * EXTERNAL        10
         */
        mechanisms?: SASLMechanism[];
        /**
         * If `explicitResourceBinding` is set to `true`, then the XMPP client
         * needs to explicitly call {@link Connection.bind} once the XMPP
         * server has advertised the `urn:ietf:propertys:xml:ns:xmpp-bind` feature.
         *
         * Making this step explicit allows client authors to first finish other
         * stream related tasks, such as setting up an XEP-0198 Stream Management
         * session, before binding the JID resource for this session.
         */
        explicitResourceBinding?: boolean;
        /**
         * _Note: This option is only relevant to Websocket connections, and not BOSH_
         *
         * If you want to connect to the current host with a WebSocket connection you
         * can tell Strophe to use WebSockets through the "protocol" option.
         * Valid values are `ws` for WebSocket and `wss` for Secure WebSocket.
         * So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
         *
         * const conn = new Strophe.Connection(
         * "/xmpp-websocket/",
         * {protocol: "wss"}
         * );
         *
         * Note that relative URLs _NOT_ starting with a "/" will also include the path
         * of the current site.
         *
         * Also because downgrading security is not permitted by browsers, when using
         * relative URLs both BOSH and WebSocket connections will use their secure
         * variants if the current connection to the site is also secure (https).
         */
        protocol?: "ws" | "wss";
        /**
         * _Note: This option is only relevant to Websocket connections, and not BOSH_
         *
         * Set this option to URL from where the shared worker script should be loaded.
         *
         * To run the websocket connection inside a shared worker.
         * This allows you to share a single websocket-based connection between
         * multiple Connection instances, for example one per browser tab.
         *
         * The script to use is the one in `src/shared-connection-worker.js`.
         */
        worker?: string;
        /**
         * Used to control whether BOSH HTTP requests will be made synchronously or not.
         * The default behaviour is asynchronous. If you want to make requests
         * synchronous, make "sync" evaluate to true.
         *
         * > const conn = new Strophe.Connection("/http-bind/", {sync: true});
         *
         * You can also toggle this on an already established connection.
         *
         * > conn.options.sync = true;
         */
        sync?: boolean;
        /**
         * Used to provide custom HTTP headers to be included in the BOSH HTTP requests.
         */
        customHeaders?: string[];
        /**
         * Used to instruct Strophe to maintain the current BOSH session across
         * interruptions such as webpage reloads.
         *
         * It will do this by caching the sessions tokens in sessionStorage, and when
         * "restore" is called it will check whether there are cached tokens with
         * which it can resume an existing session.
         */
        keepalive?: boolean;
        /**
         * Used to indicate wether cookies should be included in HTTP requests (by default
         * they're not).
         * Set this value to `true` if you are connecting to a BOSH service
         * and for some reason need to send cookies to it.
         * In order for this to work cross-domain, the server must also enable
         * credentials by setting the `Access-Control-Allow-Credentials` response header
         * to "true". For most usecases however this setting should be false (which
         * is the default).
         * Additionally, when using `Access-Control-Allow-Credentials`, the
         * `Access-Control-Allow-Origin` header can't be set to the wildcard "*", but
         * instead must be restricted to actual domains.
         */
        withCredentials?: boolean;
        /**
         * Used to change the default Content-Type, which is "text/xml; charset=utf-8".
         * Can be useful to reduce the amount of CORS preflight requests that are sent
         * to the server.
         */
        contentType?: string;
    };
    jid: string;
    domain: string;
    features: Element;
    /**
     * @typedef {Object.<string, any>} SASLData
     * @property {Object} [SASLData.keys]
     */
    /** @type {SASLData} */
    _sasl_data: {
        [x: string]: any;
    };
    do_bind: boolean;
    do_session: boolean;
    /** @type {Object.<string, SASLMechanism>} */
    mechanisms: {
        [x: string]: SASLMechanism;
    };
    /** @type {TimedHandler[]} */
    timedHandlers: TimedHandler[];
    /** @type {Handler[]} */
    handlers: Handler[];
    /** @type {TimedHandler[]} */
    removeTimeds: TimedHandler[];
    /** @type {Handler[]} */
    removeHandlers: Handler[];
    /** @type {TimedHandler[]} */
    addTimeds: TimedHandler[];
    /** @type {Handler[]} */
    addHandlers: Handler[];
    protocolErrorHandlers: {
        /** @type {Object.<number, Function>} */
        HTTP: {
            [x: number]: Function;
        };
        /** @type {Object.<number, Function>} */
        websocket: {
            [x: number]: Function;
        };
    };
    _idleTimeout: NodeJS.Timeout;
    _disconnectTimeout: TimedHandler;
    authenticated: boolean;
    connected: boolean;
    disconnecting: boolean;
    do_authentication: boolean;
    paused: boolean;
    restored: boolean;
    /** @type {(Element|'restart')[]} */
    _data: (Element | "restart")[];
    _uniqueId: number;
    _sasl_success_handler: Handler;
    _sasl_failure_handler: Handler;
    _sasl_challenge_handler: Handler;
    maxRetries: number;
    iqFallbackHandler: Handler;
    /**
     * Select protocal based on this.options or this.service
     */
    setProtocol(): void;
    _proto: Bosh | Websocket | WorkerWebsocket;
    /**
     * Reset the connection.
     *
     * This function should be called after a connection is disconnected
     * before that connection is reused.
     */
    reset(): void;
    /** @type {Request[]} */
    _requests: Request[];
    /**
     * Pause the request manager.
     *
     * This will prevent Strophe from sending any more requests to the
     * server.  This is very useful for temporarily pausing
     * BOSH-Connections while a lot of send() calls are happening quickly.
     * This causes Strophe to send the data in a single request, saving
     * many request trips.
     */
    pause(): void;
    /**
     * Resume the request manager.
     *
     * This resumes after pause() has been called.
     */
    resume(): void;
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
    getUniqueId(suffix: string): string;
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
    addProtocolErrorHandler(protocol: "HTTP" | "websocket", status_code: number, callback: Function): void;
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
    connect(jid: string, pass: string | {
        name: string;
        ck: string;
        sk: string;
        iter: number;
        salt: string;
    }, callback: Function, wait?: number, hold?: number, route?: string, authcid?: string, disconnection_timeout?: number): void;
    /** Authorization identity */
    authzid: string;
    /** Authentication identity (User name) */
    authcid: string;
    /** Authentication identity (User password) */
    pass: string | {
        name: string;
        ck: string;
        sk: string;
        iter: number;
        salt: string;
    };
    /**
     * The SASL SCRAM client and server keys. This variable will be populated with a non-null
     * object of the above described form after a successful SCRAM connection
     */
    scram_keys: any;
    connect_callback: Function;
    disconnection_timeout: number;
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
    attach(jid: string | Function, sid?: string, rid?: number, callback?: Function, wait?: number, hold?: number, wind?: number): void;
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
    restore(jid: string, callback: Function, wait?: number, hold?: number, wind?: number): void;
    /**
     * Checks whether sessionStorage and JSON are supported and whether we're
     * using BOSH.
     */
    _sessionCachingSupported(): boolean;
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
    xmlInput(elem: Node | MessageEvent): void;
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
    xmlOutput(elem: Element): void;
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
    rawInput(data: string): void;
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
    rawOutput(data: string): void;
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
    nextValidRid(rid: number): void;
    /**
     * Send a stanza.
     *
     * This function is called to push data onto the send queue to
     * go out over the wire.  Whenever a request is sent to the BOSH
     * server, all pending data is sent and the queue is flushed.
     *
     * @param {Element|Builder|Element[]|Builder[]} stanza - The stanza to send
     */
    send(stanza: Element | Builder | Element[] | Builder[]): void;
    /**
     * Immediately send any pending outgoing data.
     *
     * Normally send() queues outgoing data until the next idle period
     * (100ms), which optimizes network use in the common cases when
     * several send()s are called in succession. flush() can be used to
     * immediately send all pending data.
     */
    flush(): void;
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
    sendPresence(stanza: Element, callback?: Function, errback?: Function, timeout?: number): string;
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
    sendIQ(stanza: Element | Builder, callback?: Function, errback?: Function, timeout?: number): string;
    /**
     * Queue outgoing data for later sending.  Also ensures that the data
     * is a DOMElement.
     * @private
     * @param {Element} element
     */
    private _queueData;
    /**
     * Send an xmpp:restart stanza.
     * @private
     */
    private _sendRestart;
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
    addTimedHandler(period: number, handler: Function): TimedHandler;
    /**
     * Delete a timed handler for a connection.
     *
     * This function removes a timed handler from the connection.  The
     * handRef parameter is *not* the function passed to addTimedHandler(),
     * but is the reference returned from addTimedHandler().
     * @param {TimedHandler} handRef - The handler reference.
     */
    deleteTimedHandler(handRef: TimedHandler): void;
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
    addHandler(handler: Function, ns: string, name: string, type: string | string[], id?: string, from?: string, options?: {
        matchBareFromJid?: boolean;
        ignoreNamespaceFragment?: boolean;
    }): Handler;
    /**
     * Delete a stanza handler for a connection.
     *
     * This function removes a stanza handler from the connection.  The
     * handRef parameter is *not* the function passed to addHandler(),
     * but is the reference returned from addHandler().
     *
     * @param {Handler} handRef - The handler reference.
     */
    deleteHandler(handRef: Handler): void;
    /**
     * Register the SASL mechanisms which will be supported by this instance of
     * Connection (i.e. which this XMPP client will support).
     * @param {SASLMechanism[]} mechanisms - Array of objects with SASLMechanism prototypes
     */
    registerSASLMechanisms(mechanisms: SASLMechanism[]): void;
    /**
     * Register a single SASL mechanism, to be supported by this client.
     * @param {any} Mechanism - Object with a Strophe.SASLMechanism prototype
     */
    registerSASLMechanism(Mechanism: any): void;
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
    disconnect(reason?: string): void;
    /**
     * _Private_ helper function that makes sure plugins and the user's
     * callback are notified of connection status changes.
     * @param {number} status - the new connection status, one of the values
     *     in Strophe.Status
     * @param {string|null} [condition] - the error condition
     * @param {Element} [elem] - The triggering stanza.
     */
    _changeConnectStatus(status: number, condition?: string | null, elem?: Element): void;
    /**
     * _Private_ function to disconnect.
     *
     * This is the last piece of the disconnection logic.  This resets the
     * connection and alerts the user's connection callback.
     * @param {string|null} [condition] - the error condition
     */
    _doDisconnect(condition?: string | null): void;
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
    _dataRecv(req: Element | Request, raw?: string): void;
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
    _connect_cb(req: Element | Request, _callback: (connection: Connection) => any, raw?: string): void;
    /**
     * Sorts an array of objects with prototype SASLMechanism according to
     * their priorities.
     * @param {SASLMechanism[]} mechanisms - Array of SASL mechanisms.
     */
    sortMechanismsByPriority(mechanisms: SASLMechanism[]): import("./sasl.js").default[];
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
    authenticate(matched: SASLMechanism[]): void;
    /**
     * Iterate through an array of SASL mechanisms and attempt authentication
     * with the highest priority (enabled) mechanism.
     *
     * @private
     * @param {SASLMechanism[]} mechanisms - Array of SASL mechanisms.
     * @return {Boolean} mechanism_found - true or false, depending on whether a
     *  valid SASL mechanism was found with which authentication could be started.
     */
    private _attemptSASLAuth;
    _sasl_mechanism: import("./sasl.js").default;
    /**
     * _Private_ handler for the SASL challenge
     * @private
     * @param {Element} elem
     */
    private _sasl_challenge_cb;
    /**
     * Attempt legacy (i.e. non-SASL) authentication.
     * @private
     */
    private _attemptLegacyAuth;
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
    private _onLegacyAuthIQResult;
    /**
     * _Private_ handler for succesful SASL authentication.
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    private _sasl_success_cb;
    /**
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    private _onStreamFeaturesAfterSASL;
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
    bind(): void;
    /**
     * _Private_ handler for binding result and session start.
     * @private
     * @param {Element} elem - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    private _onResourceBindResultIQ;
    /**
     * Send IQ request to establish a session with the XMPP server.
     *
     * See https://xmpp.org/rfcs/rfc3921.html#session
     *
     * Note: The protocol for session establishment has been determined as
     * unnecessary and removed in RFC-6121.
     * @private
     */
    private _establishSession;
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
    private _onSessionResultIQ;
    /**
     * _Private_ handler for SASL authentication failure.
     * @param {Element} [elem] - The matching stanza.
     * @return {false} `false` to remove the handler.
     */
    _sasl_failure_cb(elem?: Element): false;
    /**
     * _Private_ handler to finish legacy authentication.
     *
     * This handler is called when the result from the jabber:iq:auth
     * <iq/> stanza is returned.
     * @private
     * @param {Element} elem - The stanza that triggered the callback.
     * @return {false} `false` to remove the handler.
     */
    private _auth2_cb;
    /**
     * _Private_ function to add a system level timed handler.
     *
     * This function is used to add a TimedHandler for the
     * library code.  System timed handlers are allowed to run before
     * authentication is complete.
     * @param {number} period - The period of the handler.
     * @param {Function} handler - The callback function.
     */
    _addSysTimedHandler(period: number, handler: Function): TimedHandler;
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
    _addSysHandler(handler: Function, ns: string, name: string, type: string, id: string): Handler;
    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     *
     * If the graceful disconnect process does not complete within the
     * time allotted, this handler finishes the disconnect anyway.
     * @return {false} `false` to remove the handler.
     */
    _onDisconnectTimeout(): false;
    /**
     * _Private_ handler to process events during idle cycle.
     *
     * This handler is called every 100ms to fire timed handlers that
     * are ready and keep poll requests going.
     */
    _onIdle(): void;
}
import TimedHandler from './timed-handler.js';
import Handler from './handler.js';
import Bosh from './bosh.js';
import Websocket from './websocket.js';
import WorkerWebsocket from './worker-websocket.js';
import Builder from './builder.js';
//# sourceMappingURL=connection.d.ts.map