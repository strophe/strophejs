import type SASLMechanism from './sasl';
import type Request from './request';
import Handler from './handler';
import TimedHandler from './timed-handler';
import Builder, { $build, $iq, $pres } from './builder';
import log from './log';
import { ErrorCondition, NS, Status } from './constants';
import SASLAnonymous from './sasl-anon';
import SASLExternal from './sasl-external';
import SASLOAuthBearer from './sasl-oauthbearer';
import SASLPlain from './sasl-plain';
import SASLSHA1 from './sasl-sha1';
import SASLSHA256 from './sasl-sha256';
import SASLSHA384 from './sasl-sha384';
import SASLSHA512 from './sasl-sha512';
import SASLXOAuth2 from './sasl-xoauth2';
import {
    addCookies,
    forEachChild,
    getBareJidFromJid,
    getDomainFromJid,
    getNodeFromJid,
    getResourceFromJid,
    getText,
    handleError,
    toElement,
    type Cookies,
} from './utils';
import { SessionError } from './errors';
import Bosh from './bosh';
import WorkerWebsocket from './worker-websocket';
import Websocket from './websocket';
import StreamManagement, {
    SessionStorageBackend,
    StreamManagementMirror,
    isCountableStanza,
    toStanzaView,
    type StreamManagementController,
    type StreamManagementOptions,
} from './stream-management';

export interface ConnectionOptions {
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
    cookies?: Cookies;
    /**
     * Allows you to specify the SASL authentication mechanisms that this
     * instance of Connection (and therefore your XMPP client) will support.
     *
     * The value must be an array of objects with {@link SASLMechanism}
     * prototypes.
     *
     * If nothing is specified, then the following mechanisms (and their
     * priorities) are registered:
     *
     *     Mechanism       Priority
     *     ------------------------
     *     SCRAM-SHA-512   72
     *     SCRAM-SHA-384   71
     *     SCRAM-SHA-256   70
     *     SCRAM-SHA-1     60
     *     PLAIN           50
     *     OAUTHBEARER     40
     *     X-OAUTH2        30
     *     ANONYMOUS       20
     *     EXTERNAL        10
     */
    mechanisms?: (new (...args: any[]) => SASLMechanism)[];
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
     * If `enableStreamManagement` is set to `true`, Strophe negotiates
     * XEP-0198 Stream Management on websocket connections.
     *
     * Defaults to `false`. Not available over BOSH. In combination with the
     * `worker` option, the SM session lives inside the shared worker (which
     * sees every tab's traffic) and the connection only mirrors its state.
     */
    enableStreamManagement?: boolean;
    /**
     * Fine-tuning options for XEP-0198 Stream Management — see
     * {@link StreamManagementOptions}. Only relevant together with
     * {@link ConnectionOptions.enableStreamManagement}.
     */
    streamManagement?: StreamManagementOptions;
    /**
     * _Note: This option is only relevant to Websocket connections, and not BOSH_
     *
     * If you want to connect to the current host with a WebSocket connection you
     * can tell Strophe to use WebSockets through the "protocol" option.
     * Valid values are `ws` for WebSocket and `wss` for Secure WebSocket.
     * So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
     *
     *     const conn = new Strophe.Connection(
     *         "/xmpp-websocket/",
     *         {protocol: "wss"}
     *     );
     *
     * Note that relative URLs _NOT_ starting with a "/" will also include the path
     * of the current site.
     *
     * Also because downgrading security is not permitted by browsers, when using
     * relative URLs both BOSH and WebSocket connections will use their secure
     * variants if the current connection to the site is also secure (https).
     */
    protocol?: 'ws' | 'wss';
    /**
     * _Note: This option is only relevant to Websocket connections, and not BOSH_
     *
     * Set this option to URL from where the shared worker script should be loaded.
     *
     * To run the websocket connection inside a shared worker.
     * This allows you to share a single websocket-based connection between
     * multiple Connection instances, for example one per browser tab.
     *
     * The script to use is `dist/shared-connection-worker.js`.
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
}

interface Password {
    name: string;
    ck: string;
    sk: string;
    iter: number;
    salt: string;
}

interface HandlerOptions {
    matchBareFromJid?: boolean;
    ignoreNamespaceFragment?: boolean;
}

interface SASLData {
    keys?: Record<string, unknown>;
    [key: string]: unknown;
}

type ProtocolErrorHandlers = {
    HTTP: Record<number, Function>;
    websocket: Record<number, Function>;
};

export type ConnectCallback = (status: number, condition: string | null, elem?: Element) => void;

/**
 * _Private_ variable Used to store plugin names that need
 * initialization during Connection construction.
 */
const connectionPlugins: Record<string, object> = {};

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
    service: string;
    options: ConnectionOptions;
    jid: string;
    domain: string | null;
    features: Element | null;
    _sasl_data: SASLData;
    do_bind: boolean;
    do_session: boolean;
    mechanisms: Record<string, SASLMechanism>;
    timedHandlers: TimedHandler[];
    handlers: Handler[];
    removeTimeds: TimedHandler[];
    removeHandlers: Handler[];
    addTimeds: TimedHandler[];
    addHandlers: Handler[];
    protocolErrorHandlers: ProtocolErrorHandlers;
    _idleTimeout: ReturnType<typeof setTimeout> | null;
    _disconnectTimeout: TimedHandler | null;
    authenticated: boolean;
    connected: boolean;
    disconnecting: boolean;
    do_authentication: boolean;
    paused: boolean;
    restored: boolean;
    /**
     * This connection's role in a shared-worker setup: the 'primary' tab
     * drives the stream, 'secondary' tabs share it. undefined outside worker
     * mode. Assigned by the worker (see {@link Connection#onRoleChanged}).
     */
    role?: 'primary' | 'secondary';
    _data: (Element | 'restart')[];
    _uniqueId: number;
    _sasl_success_handler: Handler | null;
    _sasl_failure_handler: Handler | null;
    _sasl_challenge_handler: Handler | null;
    maxRetries: number;
    iqFallbackHandler: Handler;
    authzid: string | null;
    authcid: string | null;
    pass: string | Password | null;
    scram_keys: Record<string, unknown> | null;
    connect_callback: ConnectCallback | null;
    disconnection_timeout: number;
    _proto: Bosh | Websocket | WorkerWebsocket;
    _sasl_mechanism: SASLMechanism | null;
    _requests: Request[];
    /**
     * The XEP-0198 Stream Management engine. Only present when the
     * `enableStreamManagement` option is set on a websocket connection.
     * Under the `worker` option this is a {@link StreamManagementMirror}:
     * the engine itself lives inside the shared worker and the mirror only
     * reflects the session state. Typed against the shared
     * {@link StreamManagementController} interface so the two are
     * interchangeable here.
     */
    sm?: StreamManagementController;
    _smHandlers: Handler[];

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
     * @param service - The BOSH or WebSocket service URL.
     * @param options - A object containing configuration options
     */
    constructor(service: string, options: ConnectionOptions = {}) {
        // The service URL
        this.service = service;
        // Configuration options
        this.options = options;

        this.setProtocol();

        this._smHandlers = [];
        if (options.enableStreamManagement) {
            if (options.worker) {
                // Under a shared worker the page hosts no SM engine since
                // the worker owns all counting and queueing. The mirror
                // only reflects the session state so that hasResumed()
                // and friends keep working in every tab.
                this.sm = new StreamManagementMirror();
            } else {
                // The engine is constructed regardless of the current
                // transport since embedders may swap `_proto` after construction.
                const smOptions = { ...(options.streamManagement || {}) };
                if (!smOptions.storage && typeof sessionStorage !== 'undefined') {
                    smOptions.storage = new SessionStorageBackend();
                }

                // The SM engine emits nonzas (and re-sends queued stanzas) as
                // strings. They are pushed directly onto the send queue and
                // they ride the same FIFO, so an <r/> goes out after the
                // stanzas it covers.
                this.sm = new StreamManagement((data: string) => {
                    this._data.push(toElement(data));
                    this._proto._send();
                }, smOptions);
            }
        }

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
            (iq: Element) => {
                this.send(
                    $iq({ type: 'error', id: iq.getAttribute('id') })
                        .c('error', { 'type': 'cancel' })
                        .c('service-unavailable', { 'xmlns': NS.STANZAS }),
                );
                return false;
            },
            null,
            null,
            ['get', 'set'],
            null,
            null,
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
     * @param name - The name of the extension.
     * @param ptype - The plugin's prototype.
     */
    static addConnectionPlugin(name: string, ptype: object): void {
        connectionPlugins[name] = ptype;
    }

    /**
     * Select protocal based on this.options or this.service
     */
    setProtocol(): void {
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
    reset(): void {
        this._proto._reset();
        // In-memory SM state only. Persisted (resumable) state is kept and
        // reloaded when the next stream advertises SM support.
        this.sm?.reset();

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

    /**
     * @returns true if the current session was established by resuming a
     *     previous one via XEP-0198 Stream Management (in which case the
     *     previously bound resource is still valid and roster/presence
     *     state was retained by the server).
     */
    hasResumed(): boolean {
        return !!this.sm?.resumed;
    }

    /**
     * @returns true if a XEP-0198 Stream Management session is currently
     *     active (i.e. <enabled/> was received or a session was resumed).
     */
    isStreamManagementEnabled(): boolean {
        return !!this.sm?.enabled;
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
    pause(): void {
        this.paused = true;
    }

    /**
     * Resume the request manager.
     *
     * This resumes after pause() has been called.
     */
    resume(): void {
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
     * @param suffix - A optional suffix to append to the id.
     * @returns A unique string to be used for the id attribute.
     */
    getUniqueId(suffix?: string | number): string {
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
     * @param protocol - 'HTTP' or 'websocket'
     * @param status_code - Error status code (e.g 500, 400 or 404)
     * @param callback - Function that will fire on Http error
     */
    addProtocolErrorHandler(protocol: 'HTTP' | 'websocket', status_code: number, callback: Function): void {
        this.protocolErrorHandlers[protocol][status_code] = callback;
    }

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
     * @param jid - The user's JID.  This may be a bare JID,
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
     * @param pass - The user password
     * @param callback - The connect callback function.
     * @param wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     * @param hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param route - The optional route value.
     * @param authcid - The optional alternative authentication identity
     *     (username) if intending to impersonate another user.
     *     When using the SASL-EXTERNAL authentication mechanism, for example
     *     with client certificates, then the authcid value is used to
     *     determine whether an authorization JID (authzid) should be sent to
     *     the server. The authzid should NOT be sent to the server if the
     *     authzid and authcid are the same. So to prevent it from being sent
     *     (for example when the JID is already contained in the client
     *     certificate), set authcid to that same JID. See XEP-178 for more
     *     details.
     *  @param disconnection_timeout - The optional disconnection timeout
     *     in milliseconds before _doDisconnect will be called.
     */
    connect(
        jid: string,
        pass: string | Password,
        callback?: ConnectCallback,
        wait?: number,
        hold?: number,
        route?: string,
        authcid?: string,
        disconnection_timeout = 3000,
    ): void {
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
        // Per-stream SM state starts fresh; resumable state is reloaded from
        // storage once the server advertises SM (_onStreamFeaturesAfterSASL).
        this.sm?.reset();

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
     * @param jid - The full JID that is bound by the session.
     * @param sid - The SID of the BOSH session.
     * @param rid - The current RID of the BOSH session.  This RID
     *     will be used by the next request.
     * @param callback - The connect callback function.
     * @param wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     *     Other settings will require tweaks to the Strophe.TIMEOUT value.
     * @param hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param wind - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    attach(
        jid: string | ConnectCallback,
        sid?: string,
        rid?: number,
        callback?: ConnectCallback,
        wait?: number,
        hold?: number,
        wind?: number,
    ): void {
        if (this._proto instanceof Bosh && typeof jid === 'string') {
            return this._proto._attach(jid, sid, rid, callback, wait, hold, wind);
        } else if (this._proto instanceof WorkerWebsocket && typeof jid === 'function') {
            return this._proto._attach(jid);
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
     * @param jid - The user's JID.  This may be a bare JID or a full JID.
     * @param callback - The connect callback function.
     * @param wait - The optional HTTPBIND wait value.  This is the
     *     time the server will wait before returning an empty result for
     *     a request.  The default setting of 60 seconds is recommended.
     * @param hold - The optional HTTPBIND hold value.  This is the
     *     number of connections the server will hold at one time.  This
     *     should almost always be set to 1 (the default).
     * @param wind - The optional HTTBIND window value.  This is the
     *     allowed range of request ids that are valid.  The default is 5.
     */
    restore(jid?: string, callback?: ConnectCallback, wait?: number, hold?: number, wind?: number): void {
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
    _sessionCachingSupported(): boolean {
        if (this._proto instanceof Bosh) {
            if (!JSON) {
                return false;
            }
            try {
                sessionStorage.setItem('_strophe_', '_strophe_');
                sessionStorage.removeItem('_strophe_');
            } catch (_e) {
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
     * Due to limitations of current Browsers' XML-Parsers the opening and closing
     * <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     * BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     * <Bosh.strip> if you want to strip this tag.
     *
     * @param _elem - The XML data received by the connection.
     */
    xmlInput(_elem: Node | MessageEvent): void {
        return;
    }

    /**
     * User overrideable function that receives XML data sent to the
     * connection.
     *
     * Due to limitations of current Browsers' XML-Parsers the opening and closing
     * <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     * BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     * <Bosh.strip> if you want to strip this tag.
     *
     * @param _elem - The XMLdata sent by the connection.
     */
    xmlOutput(_elem: Element): void {
        return;
    }

    /**
     * User overrideable function that receives raw data coming into the
     * connection.
     *
     * @param _data - The data received by the connection.
     */
    rawInput(_data: string): void {
        return;
    }

    /**
     * User overrideable function that receives raw data sent to the
     * connection.
     *
     * @param _data - The data sent by the connection.
     */
    rawOutput(_data: string): void {
        return;
    }

    /**
     * User overrideable function that receives the new valid rid.
     *
     * @param _rid - The next valid rid
     */
    nextValidRid(_rid: number): void {
        return;
    }

    /**
     * User overrideable function that receives the new role of this
     * connection in a shared-worker setup.
     *
     * Called when the shared worker assigns or changes this tab's role,
     * for example when this tab is promoted to 'primary' after the previous
     * primary tab went away.
     *
     * @param _role - The new role ('primary' or 'secondary')
     */
    onRoleChanged(_role: 'primary' | 'secondary'): void {
        return;
    }

    /**
     * User overrideable function that receives message and presence stanzas
     * sent by *another* tab sharing this connection (via the `worker`
     * option), so every tab can render what any tab sent.
     *
     * Deliberately separate from the inbound handler pipeline: these stanzas
     * were sent, not received, so they must not trigger stanza handlers.
     * IQs are not reflected — they are request/response traffic private to
     * the sending tab.
     *
     * @param _elem - The sent stanza.
     */
    onForeignStanzaSent(_elem: Element): void {
        return;
    }

    /**
     * Send a stanza.
     *
     * This function is called to push data onto the send queue to
     * go out over the wire.  Whenever a request is sent to the BOSH
     * server, all pending data is sent and the queue is flushed.
     *
     * @param stanza - The stanza to send
     */
    send(stanza: Element | Builder | (Element | Builder)[]): void {
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
    flush(): void {
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
     * @param stanza - The stanza to send.
     * @param callback - The callback function for a successful request.
     * @param errback - The callback function for a failed or timed
     *    out request.  On timeout, the stanza will be null.
     * @param timeout - The time specified in milliseconds for a
     *    timeout to occur.
     * @return The id used to send the presence.
     */
    sendPresence(
        stanza: Element | Builder,
        callback?: (stanza: Element) => void,
        errback?: (stanza: Element | null) => void,
        timeout?: number,
    ): string {
        let timeoutHandler: TimedHandler | null = null;

        const el = stanza instanceof Builder ? stanza.tree() : stanza;

        let id = el.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendPresence');
            el.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                (stanza: Element): boolean => {
                    // remove timeout handler if there is one
                    if (timeoutHandler) this.deleteTimedHandler(timeoutHandler);

                    if (stanza.getAttribute('type') === 'error') {
                        errback?.(stanza);
                    } else if (callback) {
                        callback(stanza);
                    }
                    return false;
                },
                null,
                'presence',
                null,
                id,
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
     * @param stanza - The stanza to send.
     * @param callback - The callback function for a successful request.
     * @param errback - The callback function for a failed or timed
     *     out request.  On timeout, the stanza will be null.
     * @param timeout - The time specified in milliseconds for a
     *     timeout to occur.
     * @return The id used to send the IQ.
     */
    sendIQ(
        stanza: Element | Builder,
        callback?: (stanza: Element) => void,
        errback?: (stanza: Element | null) => void,
        timeout?: number,
    ): string {
        let timeoutHandler: TimedHandler | null = null;

        const el = stanza instanceof Builder ? stanza.tree() : stanza;

        let id = el.getAttribute('id');
        if (!id) {
            // inject id if not found
            id = this.getUniqueId('sendIQ');
            el.setAttribute('id', id);
        }

        if (typeof callback === 'function' || typeof errback === 'function') {
            const handler = this.addHandler(
                (stanza: Element): boolean => {
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
                    return false;
                },
                null,
                'iq',
                ['error', 'result'],
                id,
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
     * @param element
     */
    _queueData(element: Element): void {
        if (element === null || !element.tagName || !element.childNodes) {
            const error = new Error('Cannot queue non-DOMElement.');
            error.name = 'StropheError';
            throw error;
        }
        this._data.push(element);
        // XEP-0198: every countable outbound stanza is queued here, after the
        // push, so that an <r/> emitted by the engine lands behind it in the
        // send FIFO. Hooking _queueData (rather than send/sendIQ/sendPresence)
        // means raw send() calls can't escape the counting.
        if (this.sm?.isTracking() && isCountableStanza(element.tagName)) {
            this.sm.trackOutbound(toStanzaView(element));
        }
    }

    /**
     * Send an xmpp:restart stanza.
     * @private
     */
    _sendRestart(): void {
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
     * @param period - The period of the handler.
     * @param handler - The callback function.
     * @return A reference to the handler that can be used to remove it.
     */
    addTimedHandler(period: number, handler: () => boolean): TimedHandler {
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
     * @param handRef - The handler reference.
     */
    deleteTimedHandler(handRef: TimedHandler): void {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    }

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
     * @param handler - The user callback.
     * @param ns - The namespace to match.
     * @param name - The stanza name to match.
     * @param type - The stanza type (or types if an array) to match.
     * @param id - The stanza id attribute to match.
     * @param from - The stanza from attribute to match.
     * @param options - The handler options
     * @return A reference to the handler that can be used to remove it.
     */
    addHandler(
        handler: (stanza: Element) => boolean,
        ns: string | null,
        name: string | null,
        type: string | string[] | null,
        id?: string | null,
        from?: string | null,
        options?: HandlerOptions,
    ): Handler {
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
     * @param handRef - The handler reference.
     */
    deleteHandler(handRef: Handler): void {
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
     * @param mechanisms - Array of objects with SASLMechanism prototypes
     */
    registerSASLMechanisms(mechanisms?: (new (...args: any[]) => SASLMechanism)[]): void {
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
     * @param Mechanism - Object with a Strophe.SASLMechanism prototype
     */
    registerSASLMechanism(Mechanism: any): void {
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
     * @param reason - The reason the disconnect is occuring.
     */
    disconnect(reason?: string): void {
        this._changeConnectStatus(Status.DISCONNECTING, reason);
        if (reason) {
            log.info('Disconnect was called because: ' + reason);
        } else {
            log.debug('Disconnect was called');
        }
        if (this.connected) {
            let pres: Element | null = null;
            this.disconnecting = true;
            if (this.authenticated) {
                pres = $pres({
                    'xmlns': NS.CLIENT,
                    'type': 'unavailable',
                }).tree();
            }
            // A cleanly closed stream is not resumable: send a final <a/> so
            // the server doesn't redeliver stanzas we already received, and
            // drop the persisted XEP-0198 state.
            this.sm?.onGracefulClose();
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                this.disconnection_timeout,
                this._onDisconnectTimeout.bind(this),
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
     * @param status - the new connection status, one of the values
     *     in Strophe.Status
     * @param condition - the error condition
     * @param elem - The triggering stanza.
     */
    _changeConnectStatus(status: number, condition?: string | null, elem?: Element): void {
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
     * @param condition - the error condition
     */
    _doDisconnect(condition?: string | null): void {
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
     * @param req - The request that has data ready.
     * @param raw - The stanza as raw string.
     */
    _dataRecv(req: Element | Request, raw?: string): void {
        const elem = ('_reqToData' in this._proto ? this._proto._reqToData(req as Request) : req) as Element | null;
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
        forEachChild(elem, null, (child: Element) => {
            // XEP-0198: count inbound stanzas here in the dispatch loop —
            // exactly-once, in order, and immune to handler churn.
            this.sm?.onInboundStanza(child.nodeName);
            const matches: Handler[] = [];
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
        });
    }

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
     * @param req - The current request.
     * @param _callback - low level (xmpp) connect callback function.
     *     Useful for plugins with their own xmpp connect callback (when they
     *     want to do something special).
     * @param raw - The stanza as raw string.
     */
    _connect_cb(req: Element | Request, _callback?: ConnectCallback, raw?: string): void {
        log.debug('_connect_cb was called');
        this.connected = true;

        let bodyWrap: Element | null;
        try {
            bodyWrap = ('_reqToData' in this._proto ? this._proto._reqToData(req as Request) : req) as Element | null;
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
        let hasFeatures: boolean;
        if (bodyWrap.getElementsByTagNameNS) {
            hasFeatures = bodyWrap.getElementsByTagNameNS(NS.STREAM, 'features').length > 0;
        } else {
            hasFeatures =
                bodyWrap.getElementsByTagName('stream:features').length > 0 ||
                bodyWrap.getElementsByTagName('features').length > 0;
        }
        if (!hasFeatures) {
            this._proto._no_auth_received(_callback as () => void);
            return;
        }

        const matched = Array.from(bodyWrap.getElementsByTagName('mechanism'))
            .map((m) => this.mechanisms[m.textContent])
            .filter((m) => m);

        if (matched.length === 0) {
            if (bodyWrap.getElementsByTagName('auth').length === 0) {
                // There are no matching SASL mechanisms and also no legacy
                // auth available.
                this._proto._no_auth_received(_callback as () => void);
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
     * @param mechanisms - Array of SASL mechanisms.
     */
    sortMechanismsByPriority(mechanisms: SASLMechanism[]): SASLMechanism[] {
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
     * @param matched - Array of SASL mechanisms supported.
     */
    authenticate(matched: SASLMechanism[]): void {
        if (!this._attemptSASLAuth(matched)) {
            this._attemptLegacyAuth();
        }
    }

    /**
     * Iterate through an array of SASL mechanisms and attempt authentication
     * with the highest priority (enabled) mechanism.
     *
     * @private
     * @param mechanisms - Array of SASL mechanisms.
     * @return mechanism_found - true or false, depending on whether a
     *  valid SASL mechanism was found with which authentication could be started.
     */
    _attemptSASLAuth(mechanisms?: SASLMechanism[]): boolean {
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
                null,
            );
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this),
                null,
                'failure',
                null,
                null,
            );
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_challenge_cb.bind(this),
                null,
                'challenge',
                null,
                null,
            );

            this._sasl_mechanism = mechanisms[i];
            this._sasl_mechanism.onStart(this);

            const request_auth_exchange = $build('auth', {
                'xmlns': NS.SASL,
                'mechanism': this._sasl_mechanism.mechname,
            });
            if (this._sasl_mechanism.isClientFirst) {
                const response = this._sasl_mechanism.clientChallenge(this);
                request_auth_exchange.t(btoa(response as string));
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
     * @param elem
     */
    async _sasl_challenge_cb(elem: Element): Promise<boolean> {
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
    _attemptLegacyAuth(): void {
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
                    .tree(),
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
     * @return `false` to remove the handler.
     */
    _onLegacyAuthIQResult(): boolean {
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
     * @param elem - The matching stanza.
     * @return `false` to remove the handler.
     */
    _sasl_success_cb(elem: Element): boolean {
        if (this._sasl_data['server-signature']) {
            let serverSignature: string;
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
        const streamfeature_handlers: Handler[] = [];

        const wrapper = (handlers: Handler[], elem: Element) => {
            while (handlers.length) {
                this.deleteHandler(handlers.pop());
            }
            this._onStreamFeaturesAfterSASL(elem);
            return false;
        };

        streamfeature_handlers.push(
            this._addSysHandler(
                (elem: Element) => wrapper(streamfeature_handlers, elem),
                null,
                'stream:features',
                null,
                null,
            ),
        );

        streamfeature_handlers.push(
            this._addSysHandler(
                (elem: Element) => wrapper(streamfeature_handlers, elem),
                NS.STREAM,
                'features',
                null,
                null,
            ),
        );

        // we must send an xmpp:restart now
        this._sendRestart();
        return false;
    }

    /**
     * @private
     * @param elem - The matching stanza.
     * @return `false` to remove the handler.
     */
    _onStreamFeaturesAfterSASL(elem: Element): boolean {
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
            if (this.sm && child.nodeName === 'sm' && (child as Element).namespaceURI === NS.SM) {
                this.sm.serverSupported = true;
            }
        }

        if (this.sm?.serverSupported) {
            if (this.options.worker) {
                // Only the worker knows whether resumable state exists: it
                // either sends <resume/> itself (answering _smResumed or
                // _smFailed) or replies _smNoState, upon which the
                // connection proceeds to bind (see WorkerWebsocket).
                (this._proto as WorkerWebsocket)._smFeatures();
                return false;
            }

            // SM is only negotiated over websocket. Checked here on the
            // live transport because the transport can be swapped after
            // construction (e.g. XEP-0156 discovery).
            if (this._proto instanceof Websocket) {
                this.sm.initialize(this.jid);
                if (this.sm.hasResumableState()) {
                    // Attempt XEP-0198 stream resumption instead of binding a resource.
                    this._registerSMHandlers();
                    this.sm.sendResume();
                    return false;
                }
            }
        }

        this._proceedToBind();
        return false;
    }

    /**
     * Continue the connect flow with resource binding, once it is clear no
     * XEP-0198 resumption will happen (no SM support, no resumable state, a
     * failed <resume/>, or the shared worker reporting _smNoState).
     */
    _proceedToBind(): void {
        if (!this.do_bind) {
            this._changeConnectStatus(Status.AUTHFAIL, null);
        } else if (!this.options.explicitResourceBinding) {
            this.bind();
        } else {
            this._changeConnectStatus(Status.BINDREQUIRED, null);
        }
    }

    /**
     * Register the XEP-0198 nonza handlers (idempotently)
     * They are system handlers, so they run before authentication completes,
     * which the resume flow requires.
     */
    _registerSMHandlers(): void {
        this._smHandlers.forEach((h) => this.deleteHandler(h));
        const delegate = (el: Element): boolean => {
            this.sm.onInbound(toStanzaView(el));
            return true;
        };
        this._smHandlers = [
            this._addSysHandler(delegate, NS.SM, 'r', null, null),
            this._addSysHandler(delegate, NS.SM, 'a', null, null),
            this._addSysHandler(delegate, NS.SM, 'enabled', null, null),
            this._addSysHandler((el) => this._onStreamResumed(el), NS.SM, 'resumed', null, null),
            this._addSysHandler((el) => this._onStreamResumptionFailed(el), NS.SM, 'failed', null, null),
        ];
    }

    /**
     * _Private_ handler for a successful XEP-0198 stream resumption.
     *
     * The engine reconciles the server's 'h' and re-sends whatever the
     * server didn't acknowledge.
     *
     * The connection state is restored, `this.jid` is set back to the JID that
     * was bound when the SM session was established, *before* CONNECTED is emitted,
     * so no stanza can ever be stamped with a resource the server doesn't know.
     * @param elem - The <resumed/> nonza.
     * @return `true` to keep the handler.
     */
    _onStreamResumed(elem: Element): boolean {
        this.sm.onInbound(toStanzaView(elem));
        this.do_bind = false;
        this.authenticated = true;
        this.restored = true;
        this.jid = this.sm.boundJid;
        this._changeConnectStatus(Status.CONNECTED, null);
        return true;
    }

    /**
     * _Private_ handler for a failed <enable/> or <resume/>.
     *
     * The engine resets its state; after a failed *resumption* it also
     * salvages the unacked queue (re-sent once a fresh session reaches
     * <enabled/>), and the connection falls back to binding a resource on
     * this same stream, per XEP-0198 ("the server SHOULD allow the client
     * to bind a resource at this point"). A refused <enable/> needs neither:
     * the stream is alive and bound, it just runs without SM.
     * @param elem - The <failed/> nonza.
     * @return `true` to keep the handler.
     */
    _onStreamResumptionFailed(elem: Element): boolean {
        // Read before feeding the nonza to the engine, which clears the flag.
        const resuming = this.sm.resumePending;
        this.sm.onInbound(toStanzaView(elem));
        if (resuming) {
            this.do_bind = true;
            this._proceedToBind();
        }
        return true;
    }

    /**
     * Called at the CONNECTED-emission points of the connect flow, just
     * before CONNECTED is emitted i.e. once the full JID is final (resource
     * bound, legacy session established, or legacy auth completed).
     *
     * Under the `worker` option the bound JID is always reported to the
     * shared worker — with or without Stream Management — so it can hand the
     * right JID to attaching tabs, release joins parked on the handshake,
     * and (when this stream's features advertised SM) start a fresh SM
     * session itself (it answers with _smEnabled, which updates the mirror).
     *
     * Otherwise, if the server supports XEP-0198 and nothing was resumed,
     * a fresh SM session is started from here. The XEP allows <enable/> any
     * time after binding.
     */
    _onSessionReady(): void {
        if (this.options.worker) {
            (this._proto as WorkerWebsocket)._bound(this.jid);
            return;
        }
        if (!this.sm?.serverSupported || this.sm.resumed || !(this._proto instanceof Websocket)) {
            return;
        }
        if (!this.sm.isTracking()) {
            this._registerSMHandlers();
            this.sm.sendEnable(this.jid);
        }
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
    bind(): void {
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
                    .tree(),
            );
        } else {
            this.send($iq({ type: 'set', id: '_bind_auth_2' }).c('bind', { xmlns: NS.BIND }).tree());
        }
    }

    /**
     * _Private_ handler for binding result and session start.
     * @private
     * @param elem - The matching stanza.
     * @return `false` to remove the handler.
     */
    _onResourceBindResultIQ(elem: Element): boolean {
        if (elem.getAttribute('type') === 'error') {
            log.warn('Resource binding failed.');
            const conflict = elem.getElementsByTagName('conflict');
            let condition: string | undefined;
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
                    this._onSessionReady();
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
    _establishSession(): void {
        if (!this.do_session) {
            throw new Error(
                `Connection.prototype._establishSession ` +
                    `called but apparently ${NS.SESSION} wasn't advertised by the server`,
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
     * @param elem - The matching stanza.
     * @return `false` to remove the handler.
     */
    _onSessionResultIQ(elem: Element): boolean {
        if (elem.getAttribute('type') === 'result') {
            this.authenticated = true;
            this._onSessionReady();
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
     * @param elem - The matching stanza.
     * @return `false` to remove the handler.
     */
    _sasl_failure_cb(elem: Element | null): boolean {
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
     * @param elem - The stanza that triggered the callback.
     * @return `false` to remove the handler.
     */
    _auth2_cb(elem: Element): boolean {
        if (elem.getAttribute('type') === 'result') {
            this.authenticated = true;
            this._onSessionReady();
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
     * @param period - The period of the handler.
     * @param handler - The callback function.
     */
    _addSysTimedHandler(period: number, handler: () => boolean): TimedHandler {
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
     * @param handler - The callback function.
     * @param ns - The namespace to match.
     * @param name - The stanza name to match.
     * @param type - The stanza type attribute to match.
     * @param id - The stanza id attribute to match.
     */
    _addSysHandler(
        handler: (stanza: Element) => boolean,
        ns: string | null,
        name: string | null,
        type: string | null,
        id: string | null,
    ): Handler {
        const hand = new Handler(handler, ns, name, type, id, null);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    }

    /**
     * _Private_ timeout handler for handling non-graceful disconnection.
     *
     * If the graceful disconnect process does not complete within the
     * time allotted, this handler finishes the disconnect anyway.
     * @return `false` to remove the handler.
     */
    _onDisconnectTimeout(): boolean {
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
    _onIdle(): void {
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
        const newList: TimedHandler[] = [];
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
