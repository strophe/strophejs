/**
 * @typedef {import("./connection.js").default} Connection
*/
import { Status } from './constants.js';

/**
 * @typedef {Object} FastCredential
 * @property {string} [clientID] 
 * @property {string} [mechanism]
 * @property {string} [token]
 * @property {Number} [expiry]
 * @property {Number} [counter] 
 */

/**
 * @this {{ conn: Connection }}
 */
const FAST = {
    NS: 'urn:xmpp:fast:0',

    /** @type {Connection} */
    conn: null,

    // Mechanisms supported by both us and the server
    // note that there are SASL2 mechanisms and then SASL2-FAST mechanisms
    // it's nested in a <internal><fast>...</fast></internal>
    // we merge the two, but the server sends them separately,
    // and those in *this* subset are ones we respond with our own <fast> tag.
    /** @type {String[]} } */
    mechanisms: null,

    /** @type {FastCredential} */
    credential: null,

    /**
     * Create and initialize a new Handler.
     *
     * @param {Connection} connection 
     */
    init: function (connection) {
        this.conn = connection

        this.credential = {
            'clientID': this.conn.sasl2.clientID,
        }

        // **monkey-patch** SASL2 to add
        // - FAST <fast> to outgoing <authenticate>s using a FAST mechanism
        // - FAST <request-token> other outgoing <authenticate>s
        //
        // (XXX: a better solution would be an _outgoing_ handler system)
        //
        // TODO: for completeness, test that it's possible to use a FAST
        // <authenticate> with one mechanism to <request-token> for a different
        // e.g. it should be legal and possible to send
        //   <authenticate mechanism="HT-SHA-512-ENDP"><request-token mechanism="HT-SHA-256-NONE" /></authenticate>

        const authenticateStanza = this.conn.sasl2.authenticateStanza.bind(this.conn.sasl2) // XXX is the .bind() necessary?
        this.conn.sasl2.authenticateStanza = async (mechname) => {
            let authenticate = await authenticateStanza(mechname);

            // Try to authenticate with FAST
            // The protocol here is subtly different. The *implicit assumption* is that
            // that the <fast> and the <challenge>/<response> mechanisms do not overlap.
            if (/* mechname is in fact accepted by the server as a FAST mechanism */
                this.mechanisms.indexOf(mechname) != -1 &&
                /* AND we have a token for it */
                this.credential?.mechanism == mechname) {

                if (!this.credential.token) {
                    // mechanism.test() shouldn't have let us get here
                    throw new Exception(`Tried to authenticate with FAST mechanism ${mechname} without fast.credential being defined`);
                }

                // > To indicate that it is providing a token, the client MUST
                // > include a <fast/> element qualified by the 'urn:xmpp:fast:0' namespace,
                // > within its SASL2 authentication request.
                // - https://xmpp.org/extensions/xep-0484.html#fast-auth
                authenticate
                    .c("fast", {
                        'xmlns': this.NS,
                        // replay protection
                        // > Servers MUST reject any authentication requests received via
                        // > TLS 0-RTT payloads that do not include a 'count' attribute
                        // - https://xmpp.org/extensions/xep-0484.html#fast-auth
                        'count': this.credential.counter.toString()
                    }).up()
                // > The value of this attribute MUST be a positive integer, which is
                // >  incremented by the client on every authentication attempt
                // - https://xmpp.org/extensions/xep-0484.html#fast-auth
                this.credential.counter++;
            } else {
                // When authenticating with a different-than-current FAST mechanism
                // initiate FAST by sending <request-token>
                let other_mechanisms = [...this.mechanisms ?? []].filter((m) => m != mechname)
                if (other_mechanisms.length > 0) {

                    // just pick the first mechanism
                    let mechname = other_mechanisms[0]

                    // remember which one we picked because the server won't tell us
                    this.credential = { ...this.credential, 'mechanism': mechname }

                    // send it
                    authenticate
                        .c('request-token', {
                            'xmlns': this.NS,
                            'mechanism': mechname,
                        }).up()
                }
            }

            return authenticate;
        }

        // **MONKEY-PATCH** connection to catch the logout event
        let reset = this.conn.reset.bind(this.conn)
        this.conn.reset = () => {
            this.logout.bind(this)().then(() => {
		reset()
	    })
        }
    },

    /**
     * 
     * @param {Number} status 
     */
    statusChanged: function (status) {
        if (status === Status.CONNECTING) {
            // Register listeners before we get data (CONNECTING) so
            // we can catch the crucial first stanzas
            this.conn._addSysNSHandler(this.onAuth.bind(this), this.NS, 'fast');
            this.conn._addSysNSHandler(this.onToken.bind(this), this.NS, 'token');

            // Load token from passed in credentials, if given,
            // Make sure to synchronize token's clientID with SASL2;
            // clientID is optional for SASL2 but unfortunately mandatory for FAST
            // > MUST also provide the a SASL2 <user-agent> element with an 'id' attribute
            // > (both of these values are discussed in more detail in XEP-0388).
            // - https://xmpp.org/extensions/xep-0484.html#rules-clients
            // Simply: clientID plays the role of username and token the role of password.
            const { pass } = this.conn;
            if (pass.token) {
                this.credential = /** @type {FastCredential} */ pass;
                this.conn.sasl2.clientID = this.credential.clientID
            } else {
                //
                this.credential = {
                    'clientID': this.conn.sasl2.clientID,
                }
            }
        }
    },

    /**
     * @param {Element} elem 
     */
    onAuth: function (elem) {

        // Note: this looks *a lot* like sasl2.onAuth(),
        // but it runs on a different tag, a sub-tag of the main <authentication> stanza

        const server_mechanisms = new Set([...elem.querySelectorAll('mechanism')]
            .map((m) => m.textContent));

        this.mechanisms = [...server_mechanisms
            .intersection(
                new Set(Object.keys(this.conn.mechanisms))
            )];
        // sort by priority
        this.mechanisms.sort((a, b) => {
            (this.conn.mechanisms[b].priority - this.conn.mechanisms[a].priority)
        })

        console.info(
            "FAST: server advertised ", server_mechanisms,
            " of which we support", this.mechanisms);
        if (this.mechanisms.length == 0) {
            console.warn("FAST offered but with no known mechanisms.");
            return
        }

        // Append to the list of SASL2 mechanisms
        // XXX what happens if this runs before sasl2.onAuth()?
        this.conn.sasl2.mechanisms = [...
            new Set(this.conn.sasl2.mechanism)
                .union(new Set(this.mechanisms))
        ];
        // sort by priority XXX the FAST mechanisms should have higher priority!
        this.conn.sasl2.mechanisms.sort((a, b) => {
            return (this.conn.mechanisms[b].priority - this.conn.mechanisms[a].priority)
        })

        return false; // stop listening
    },

    /**
     * @param {Element} elem 
     */
    onToken: function (elem) {

        this.credential = {
            ...this.credential,
            'token': elem.getAttribute('token'),
            'expiry': Date.parse(elem.getAttribute('expiry')),
            'counter': 0,
        };
        console.log("fast plugin onToken", elem, this.credential)

        return true; // keep listening: the server is allowed to rotate our token anytime it wishes
    },

    logout: async function () {
        // Invalidate the FAST token on log out
        // XXX this does not seem to actually get sent,
        // and Converse does not forget the token from its IndexedDB
        // if you edit Local Storage using the web debugger to re-add conversejs-session-jid: 'user@xmpp.example.org'
        // and reload then FAST will happily log you back in

        if (this.credential.token) {
            let authenticate = await this.conn.sasl2.authenticateStanza(this.credential.mechanism)

            // XXX copy-pasta
            const response = await this.conn.mechanisms[this.credential.mechanism].clientChallenge(this.conn);
            authenticate
                .c('initial-response',
                    null,
                    btoa(/** @type {string} */(response)))
                .up();

            authenticate.nodeTree.querySelector("fast")?.setAttribute("invalidate", "true")

            this.conn.send(authenticate.tree())
        }
    }
};

export default FAST;
