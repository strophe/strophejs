import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA256 extends SASLMechanism {
    /** PrivateConstructor: SASLSHA256
     *  SASL SCRAM SHA 256 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-256', isClientFirst = true, priority = 70) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid !== null;
    }

    // eslint-disable-next-line class-methods-use-this
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-256', 256);
    }

    // eslint-disable-next-line class-methods-use-this
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}
