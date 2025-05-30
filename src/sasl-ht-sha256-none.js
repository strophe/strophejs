/**
 * @typedef {import("./types/connection.js").default} Connection
*/
import SASLMechanism from './sasl.js';
import {
    getNodeFromJid,
} from './utils.js';
// TODO: factor this and do the other methods defined in https://datatracker.ietf.org/doc/draft-schmaus-kitten-sasl-ht/09/
// import ht from './ht.js';

class SASLHTSHA256NONE extends SASLMechanism {
    /**
     * SASL HT SHA 256 authentication.
     */
    constructor(mechname = 'HT-SHA-256-NONE', isClientFirst = true, priority = 75) {
        super(mechname, isClientFirst, priority);
    }

    /**
     * @param {Connection} connection
     */
    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        let T = (connection.fast?.token?.mechanism == this.mechname)
            && (Date.now() < connection.fast?.token?.expiry - 30); // -30 for some wiggle room in clock skew etc

        return true;
    }

    /**
     * @param {Connection} connection
     * @param {string} [challenge]
     */
    // eslint-disable-next-line class-methods-use-this
    onChallenge(connection, challenge) {
        throw new Error("Hashed-Token methods do not respond to challenges");
    }

    /**
     * @param {Connection} connection
     * @param {string} [test_cnonce]
     */
    // eslint-disable-next-line class-methods-use-this
    async clientChallenge(connection, test_cnonce) {
        // from https://github.com/xmppjs/xmpp.js/blob/d01b2f1dcb81c7d2880d1021ca352256675873a4/packages/sasl-ht-sha-256-none/index.js#L12
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(connection.fast?.token?.token),
            // https://developer.mozilla.org/en-US/docs/Web/API/HmacImportParams
            { name: "HMAC", hash: "SHA-256" },
            false, // extractable
            ["sign", "verify"],
        )
        const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode("Initiator"),
        )
        return `${getNodeFromJid(connection.jid)}\0${String.fromCodePoint(...new Uint8Array(signature))}`;
    }
}

export default SASLHTSHA256NONE;
