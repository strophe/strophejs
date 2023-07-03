/**
 * @typedef {import("./connection.js").default} Connection
 */
import SASLMechanism from './sasl.js';
import utils from './utils';

class SASLPlain extends SASLMechanism {
    /**
     * SASL PLAIN authentication.
     */
    constructor(mechname = 'PLAIN', isClientFirst = true, priority = 50) {
        super(mechname, isClientFirst, priority);
    }

    /**
     * @param {Connection} connection
     */
    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid !== null;
    }

    /**
     * @param {Connection} connection
     */
    // eslint-disable-next-line class-methods-use-this
    onChallenge(connection) {
        const { authcid, authzid, domain, pass } = connection;
        if (!domain) {
            throw new Error('SASLPlain onChallenge: domain is not defined!');
        }
        // Only include authzid if it differs from authcid.
        // See: https://tools.ietf.org/html/rfc6120#section-6.3.8
        let auth_str = authzid !== `${authcid}@${domain}` ? authzid : '';
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + authcid;
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + pass;
        return utils.utf16to8(auth_str);
    }
}

export default SASLPlain;
