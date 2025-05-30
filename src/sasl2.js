/**
 * @typedef {import("./connection.js").default} Connection
 */
import { Status } from './constants.js';
import { getText } from './utils.js';

const SASL2 = {
    // TODO: turn this into a full module
    'NS': 'urn:xmpp:sasl:2',

    /** @type {Connection} */
    conn: null,

    /**
     * Create and initialize a new Handler.
     *
     * @param {Connection} connection 
     */
    init: function (connection) {
        this.conn = connection;

        // generate a new ephemeral client ID for <user-agent> stanza
        // XXX note that if using FAST this is *non* ephemeral:
        // it is the username and the FAST token is the password
        this.clientID = this.conn.getUniqueId();
    },

    /**
     * 
     * @param {Number} status 
     */
    statusChanged: function (status) {

        console.warn("statusChanged:", status)

        if (status == Status.CONNECTING) {

            // Register listeners *before* we read any data (CONNECTING)
            // so we can catch the crucial first stanzas 

            // This listener doesn't work with the normal Strophe handlers because
            // 1. <stream:features> is special-cased in connection.js and not passed to handlers
            // 2. addSysHandler() can only hook top-level tags, but <authentication> is nested in <stream:features>
            // TODO: rewrite more verbosely using addSysHandler. If possible.
            this.conn._addSysNSHandler(
                this.onAuth.bind(this),
                this.NS,
                'authentication'
            )
        }
    },

    /**
     * @param {Element} elem 
     */
    onAuth: async function (elem) {
        const server_mechanisms = [...elem.querySelectorAll('mechanism')]
            .map((m) => m.textContent);

        /** @type {String[]} } */
        this.mechanisms = [...
            new Set(server_mechanisms)
                .intersection(new Set(Object.keys(this.conn.mechanisms)))
        ];

        console.info(
            "SASL2: server advertised ", server_mechanisms,
            " of which we support", this.mechanisms);
        if (this.mechanisms.length == 0) {
            console.warn("FAST offered but with no known mechanisms.");
        }

        return false; // stop listening
    },

    async authenticateStanza(/** @type String */ mechname) {
        const authenticate = $build('authenticate', {
            'xmlns': this.NS,
            'mechanism': mechname,
        });

        authenticate
            .c('user-agent', { 'id': this.clientID })
            .c("software", "Strophe.js").up()
            .c("device", navigator?.userAgent ?? "").up()
            .up();

        return authenticate
    },

    authenticate: async function () {
        if (this.conn.authenticated) {
            console.warn("SASL2: Already authenticated; not authenticating again.");
            return
        }

        // sort by priority
        this.mechanisms.sort((a, b) => {
            return (this.conn.mechanisms[b].priority - this.conn.mechanisms[a].priority)
        })

        for (let mechname of this.mechanisms) {

            let mechanism = this.conn.mechanisms[mechname]
            if (!mechanism) {
                console.warn(`SASL2: Unknown mechanism ${mechname}`)
            }
            if (!mechanism.test(this.conn)) {
                console.debug("SASL2: skipping mechanism", mechname)
                continue
            }
            console.debug("SASL2: trying mechanism", mechname)

            if (await this._authenticate(mechname)) {
                this.conn.authenticated = true;
                console.debug("SASL 2 mechanism", mechname, "succeded")
                return true;
            } else {
                console.debug("SASL 2 mechanism", mechname, "failed")
                // return false ; // *stop* fallback
            }
        }

        return false;
    },

    _authenticate: async function (mechname) {
        let mechanism = this.conn.mechanisms[mechname]
        if (!mechanism) {
            console.warn(`SASL2: Unknown mechanism ${mechname}`)
        }
        if (!mechanism.test(this.conn)) {
            return false
        }
        this.conn._sasl_mechanism = mechanism; // backwards compat

        // wrap Strophe's callback-based API into a deferred Promise
        let resolve_sasl_response
        /** @type Promise<Element> */
        let _response = new Promise((resolve, _) => {

            resolve_sasl_response = resolve
        })

        let success_handler = this.conn._addSysHandler(
            (elem) => resolve_sasl_response(elem),
            this.NS,
            'success',
            null,
            null
        );
        let failure_handler = this.conn._addSysHandler(
            (elem) => resolve_sasl_response(elem),
            this.NS,
            'failure',
            null,
            null
        );
        let challenge_handler = this.conn._addSysHandler(
            (elem) => resolve_sasl_response(elem),
            this.NS,
            'challenge',
            null,
            null
        );

        const clear_handlers = () => {
            if (success_handler) {
                this.conn.deleteHandler(success_handler);
                success_handler = null
            }
            if (failure_handler) {
                this.conn.deleteHandler(failure_handler);
                failure_handler = null
            }
            if (challenge_handler) {
                this.conn.deleteHandler(challenge_handler);
                challenge_handler = null
            }
        }

        // delay to allow the idle loop to reliably install the new handlers
        await Promise.resolve();

        // fast needs to modify non-fast <authenticate>s
        // and needs to change the format slightly for FAST <authenticate>s

        let authenticate = await this.authenticateStanza(mechname)

        mechanism.onStart(this.conn);
        if (mechanism.isClientFirst) {
            const response = await mechanism.clientChallenge(this.conn);
            authenticate
                .c('initial-response',
                    null,
                    btoa(/** @type {string} */(response)))
                .up();
        }
        console.debug("SASL2: sending <authenticate>", authenticate.tree())
        this.conn.send(authenticate.tree());
        try {
            while (true) { // SASL loops, sending [ <challenge> <response> ... ] until <success>

                const response = await _response;
                console.debug(`SASL2: <${response.tagName}>:`, response)

                if (response.tagName == 'challenge') {
                    this.conn._sasl_challenge_cb.bind(this.conn)(response); // this callback replies to the server with a <response>
                } else if (response.tagName == 'success') {
                    this.conn._sasl_success_cb.bind(this.conn)(response); // this callback verifies the server's final <additional-data>
                    return true
                } else if (response.tagName == 'failure') {
                    this.conn._sasl_failure_cb.bind(this.conn)(response); // this sends an error event up the stack
                    return false
                } else {
                    throw new Exception("Unknown SASL2 response:", response)
                }

                // reset the deferred promise
                _response = new Promise(resolve => {
                    resolve_sasl_response = resolve
                })
            }
        } catch (e) {
            console.error(e);
            throw e;
        } finally {
            clear_handlers()
        }

    },
};

export default SASL2;
