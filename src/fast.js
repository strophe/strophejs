/**
 * @typedef {import("./connection.js").default} Connection
 */
import SASLMechanism from './sasl.js';
import { ElementType, Status } from './constants.js';
import {
    getBareJidFromJid,
    getText
} from './utils.js';

const SASL2 = {
    // TODO: turn this into a full module
    'NS': 'urn:xmpp:sasl:2'
}

/**
 * @this {{ conn: Connection }}
 */
const FAST = {
    NS: 'urn:xmpp:fast:0',

    /** @type {Connection} */
    conn: null,

    /**
     * @typedef {Object} FastToken
     * @property {string} [mechanism]
     * @property {string} [token]
     * @property {Number} [expiry]
     * @property {Number} [counter] 
     */

    /** @type {FastToken} */
    token: null,

    // Mechanisms supported by both us and the server
    /** @type {String[]} } */
    mechanisms: null,

    // The **active** mechanism
    /** @type {String} */
    mechname: null,

    /**
     * Create and initialize a new Handler.
     *
     * @param {Connection} connection 
     */
    init: function (connection) {
        this.conn = connection
        this.mechanisms = []

        // XXX messy; should be up in Converse.JS
        let jid = getBareJidFromJid(localStorage.getItem("strophe-jid"));
        if (!this.jid || (jid === getBareJidFromJid(this.jid)) && !this.token) {
            this.conn.jid = jid;
            let _token = localStorage.getItem(`strophe-fast-token:${jid}`)
            if (_token) {
                this.token = JSON.parse(_token)
                console.log("Loaded", this.token, "from localStorage")
            }
        }

        this._auth = this._auth.bind(this)
        this.test = this.test.bind(this)
    },

    /**
     * 
     * @param {Number} status 
     */
    statusChanged: function (status) {
        // init doesn't actually init: handlers get cleared at connection time,
        // or at least, ConverseJS clears them then
        // the safe place to do init is here, which is special-cased in connection.js


        // Register listeners before we get data (CONNECTING) so
        // we can catch the crucial first stanzas but actually do
        // auth only once we get to AUTHENTICATING because that
        // needs the basic infrastructure of the stream/session to be set up

        if (status === Status.CONNECTING) {

            //Strophe.addNamespace('FAST', 'urn:xmpp:fast:0') // TODO: load this plugin in a more sensible way

            console.warn("FAST: .onConnecting")
            // TODO: make this re-entrant, i.e. either always delete and recreate or track if our handler has been assigned
            this.conn._addSysNSHandler(this.onSuccess.bind(this), SASL2.NS, 'success');
            this.conn._addSysNSHandler(this.onChallenge.bind(this), SASL2.NS, 'challenge');
            this.conn._addSysNSHandler(this.onFailure.bind(this), SASL2.NS, 'failure');

            this.conn._addSysNSHandler(this.onAuth.bind(this), this.NS, 'fast');
            this.conn._addSysNSHandler(this.onToken.bind(this), this.NS, 'token');

            console.warn("/FAST: .onConnecting")
            // the less disruptive way to design this, instead of hacking the core match logic:
            // - set up a sasl2 module that hooks the top level <authentication>, <success>, <challenge>, <continue>, <failure> stanzas
            // - provide an events API *in there* (using that .on() library?)
            // - fast hooks into the events API
            //
            // or, even less invasive:
            //
            // - hook the top level SASL2 stanzas we know we need to look for here (namely: <success> and <authentication>)
            //   and just parse them, as connection.js does for SASLv1
            //
            //  but always:
            // - still hack the core logic to allow hooking the first stanza, that's important for auth
            //
        } else if (status === Status.AUTHENTICATING) {

            // console.warn("FAST: .onAuthenticating")
            // this._auth().then(() => {

            //     console.warn("/FAST: .onAuthenticating")
            // }).catch((err) => console.error(err));
        }
    },


    // TODO: pull these to a SASL2 module
    /**
     * @param {Element} elem 
     */
    onSuccess: function (elem) {
        const username = getText(elem.getElementsByTagName('authorization-identifier')[0])
        console.info(`SASL2: authenticated as ${username}`, elem)
        this.conn.authenticated = true;

        // XXX messy; should be up in Converse.JS
        let jid = getBareJidFromJid(this.conn.jid)
        localStorage.setItem("strophe-jid", jid)
        localStorage.setItem(`strophe-fast-token:${jid}`, JSON.stringify(this.token)); // disabled for debugging

        console.log("saved", this.token, "to localStorage")

        return true; // keep listening
    },
    /**
     * @param {Element} elem 
     */
    onChallenge: function (elem) {
        console.debug("SASL2: challenge received:", elem)
        return true; // keep listening
    },
    /**
     * @param {Element} elem 
     */
    onFailure: function (elem) {
        console.info("SASL2: authentication failed", elem)
        this.conn.authenticated = false;
        return true; // keep listening
    },

    /**
     * @param {Element} elem 
     */
    onAuth: function (elem) {
        const sasl2_fast_offers = [...elem.querySelectorAll('mechanism')]
            .map((m) => m.textContent);

        //* @var {Set<String>} sasl2_fast_matched */
        let sasl2_fast_matched = (new Set(sasl2_fast_offers)).intersection(new Set(Object.keys(this.conn.mechanisms)));

        this.mechanisms = [...sasl2_fast_matched]
        console.info(
            "FAST: server advertised ", sasl2_fast_offers,
            " of which we support", this.mechanisms);
        if (this.mechanisms.length == 0) {
            console.warn("FAST offered but with no known mechanisms.");
            return
        }

        if (this.token && sasl2_fast_matched.has(this.token.mechanism)) {
            // prefer the method of our current token, if we have it
            this.mechname = this.token.mechanism;
        } else {
            // pick the first one
            this.mechname = this.mechanisms[0]
        }

        console.info(`FAST: chose ${this.mechname}`);

        // TODO: we need a way to edit outgoing stanzas too to tack the 'request-token' bit onto the backs of other auths..
        // but how? Is there an outgoing listeners system?

        return true;
    },

    test: function () {
        // this is janky
        return (this.token?.mechanism && this.mechname
            && new Set(this.mechanisms).has(this.token.mechanism)
            && this.conn.mechanisms[this.mechname].test(this.conn))
    },
    _auth: async function () {
        console.warn("fast._auth()")
        // and attempt to authenticate with it
        console.info("FAST: attempting login")
        let initial_response = await this.conn.mechanisms[this.mechname].clientChallenge(this.conn, null);
        if (initial_response == false) {
            console.warn(`FAST ${this.mechname} refused to provide an <initial-response>`)
        }
        initial_response = btoa(initial_response)
        console.info("initial response", initial_response)
        const authenticate = $build('authenticate', {
            'xmlns': SASL2.NS,
            'mechanism': this.mechname,
        }).c('initial-response', null,
            initial_response)
            .up()

            // > MUST also provide the a SASL2 <user-agent> element with an 'id' attribute
            // > (both of these values are discussed in more detail in XEP-0388).
            // - https://xmpp.org/extensions/xep-0484.html#rules-clients
            .c('user-agent', {
                // TODO: *this should be cached* in browser storage; else it will appear like hundreds of devices are connected to one's account
                'id': "111222333444" //this.conn.getUniqueId("useragent")
            })
            .c("software", "Strophe.js").up()
            .c("device", "MacBook").up()
            .up().c("fast", {
                // replay protection
                // > Servers MUST reject any authentication requests received via
                // > TLS 0-RTT payloads that do not include a 'count' attribute
                // - https://xmpp.org/extensions/xep-0484.html#fast-auth
                'count': this.token.counter.toString(),
                'xmlns': this.NS,
            })

        let t = authenticate.tree()
        console.error("Senidng FAST AUTH", t)
        this.conn.send(t);
        console.error("/Senidng FAST AUTH", t)

        this.token.counter++;

        return new Promise((resolve, reject) => {
            this.conn._addSysHandler((elem /** {Element} */) => {
                console.log("FAST: succeeded", elem)
                // check that this.conn.jid == elem.jid.text?
                resolve(elem)
                false; // stop listening
            }, SASL2.NS, 'success', null, null)
            this.conn._addSysHandler((elem /** {Element} */) => {
                console.warn("FAST: token login failed; invalidating current token", elem)
                reject(elem)

                // AND invalidate creds
                // That means the user will drop back to the login page
                // and then have to try again with a password
                let jid = getBareJidFromJid(this.conn.jid)
                //localStorage.removeItem(`strophe-fast-token:${jid}`)
                this.token = null;

                console.log("cleared", this.token, "from localStorage")
            }, SASL2.NS, 'failure', null, null)
        });

    },

    /**
     * @param {Element} elem 
     */
    onToken: function (elem) {
        console.log("fast plugin onToken", elem)
        console.log(this)

        this.token = {
            'mechanism': this.mechname,
            'token': elem.getAttribute('token'),
            'expiry': Date.parse(elem.getAttribute('expiry')),
            'counter': 0
        };
        let v = 1;
        return true;
    }
};

export default FAST;