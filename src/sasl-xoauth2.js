import SASLMechanism from './sasl.js';
import utils from './utils';

/**
 * @typedef {import("./connection.js").default} Connection
 */

class SASLXOAuth2 extends SASLMechanism {
    /**
     * SASL X-OAuth2 authentication.
     */
    constructor(mechname = 'X-OAUTH2', isClientFirst = true, priority = 30) {
        super(mechname, isClientFirst, priority);
    }

    /**
     * @param {Connection} connection
     */
    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.pass !== null;
    }

    /**
     * @param {Connection} connection
     */
    // eslint-disable-next-line class-methods-use-this
    onChallenge(connection) {
        let auth_str = '\u0000';
        if (connection.authcid !== null) {
            auth_str = auth_str + connection.authzid;
        }
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + connection.pass;
        return utils.utf16to8(auth_str);
    }
}

export default SASLXOAuth2;
