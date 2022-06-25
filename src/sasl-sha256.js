import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA256 extends SASLMechanism {

    /** PrivateConstructor: SASLSHA256
     *  SASL SCRAM SHA 256 authentication.
     */
    constructor (mechname='SCRAM-SHA-256', isClientFirst=true, priority=70) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    async onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this, require-await
        return scram.scramResponse(connection, challenge, "SHA-256", 256);
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        return scram.clientChallenge(connection, test_cnonce);
    }
}
