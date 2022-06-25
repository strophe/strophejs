import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA384 extends SASLMechanism {

    /** PrivateConstructor: SASLSHA384
     *  SASL SCRAM SHA 384 authentication.
     */
    constructor (mechname='SCRAM-SHA-384', isClientFirst=true, priority=71) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    async onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this, require-await
        return scram.scramResponse(connection, challenge, "SHA-384", 384);
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        return scram.clientChallenge(connection, test_cnonce);
    }
}
