import SASLMechanism from './sasl.js';
import scram from './scram.js';

/**
 * @typedef {import("./connection.js").default} Connection
 */

class SASLSHA512 extends SASLMechanism {
    /**
     * SASL SCRAM SHA 512 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-512', isClientFirst = true, priority = 72) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid !== null;
    }

    /**
     * @param {Connection} connection
     * @param {string} [challenge]
     */
    // eslint-disable-next-line class-methods-use-this
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-512', 512);
    }

    // eslint-disable-next-line class-methods-use-this
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}

export default SASLSHA512;
