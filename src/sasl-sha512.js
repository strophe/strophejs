/**
 * @typedef {import("./connection.js").default} Connection
 */
import SASLMechanism from './sasl.js';
import scram from './scram.js';

class SASLSHA512 extends SASLMechanism {
    /**
     * SASL SCRAM SHA 512 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-512', isClientFirst = true, priority = 72) {
        super(mechname, isClientFirst, priority);
    }

    /**
     * @param {Connection} connection
     */
    test(connection) {
        return scram.test(connection, 'SHA-512', 512);
    }

    /**
     * @param {Connection} connection
     * @param {string} [challenge]
     */
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-512', 512);
    }

    /**
     * @param {Connection} connection
     * @param {string} [test_cnonce]
     */
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}

export default SASLSHA512;
