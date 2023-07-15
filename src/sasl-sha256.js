/**
 * @typedef {import("./connection.js").default} Connection
 */
import SASLMechanism from './sasl.js';
import scram from './scram.js';

class SASLSHA256 extends SASLMechanism {
    /**
     * SASL SCRAM SHA 256 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-256', isClientFirst = true, priority = 70) {
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
     * @param {string} [challenge]
     */
    // eslint-disable-next-line class-methods-use-this
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-256', 256);
    }

    /**
     * @param {Connection} connection
     * @param {string} [test_cnonce]
     */
    // eslint-disable-next-line class-methods-use-this
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}

export default SASLSHA256;
