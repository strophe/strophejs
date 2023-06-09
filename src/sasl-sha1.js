import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA1 extends SASLMechanism {
    /** PrivateConstructor: SASLSHA1
     *  SASL SCRAM SHA 1 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-1', isClientFirst = true, priority = 60) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid !== null;
    }

    // eslint-disable-next-line class-methods-use-this
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-1', 160);
    }

    // eslint-disable-next-line class-methods-use-this
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}
