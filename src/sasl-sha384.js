/**
 * @typedef {import("./connection.js").default} Connection
 */
import SASLMechanism from './sasl.js';
import scram from './scram.js';

class SASLSHA384 extends SASLMechanism {
    /**
     * SASL SCRAM SHA 384 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-384', isClientFirst = true, priority = 71) {
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
        return await scram.scramResponse(connection, challenge, 'SHA-384', 384);
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

export default SASLSHA384;
