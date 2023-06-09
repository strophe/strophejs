import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA384 extends SASLMechanism {
    /** PrivateConstructor: SASLSHA384
     *  SASL SCRAM SHA 384 authentication.
     */
    constructor(mechname = 'SCRAM-SHA-384', isClientFirst = true, priority = 71) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid !== null;
    }

    // eslint-disable-next-line class-methods-use-this
    async onChallenge(connection, challenge) {
        return await scram.scramResponse(connection, challenge, 'SHA-384', 384);
    }

    // eslint-disable-next-line class-methods-use-this
    clientChallenge(connection, test_cnonce) {
        return scram.clientChallenge(connection, test_cnonce);
    }
}
