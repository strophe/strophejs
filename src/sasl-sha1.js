import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA1 extends SASLMechanism {

    /** PrivateConstructor: SASLSHA1
     *  SASL SCRAM SHA 1 authentication.
     */
    constructor (mechname='SCRAM-SHA-1', isClientFirst=true, priority=60) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    async onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this, require-await
        return scram.scramResponse(connection, challenge, "SHA-1", 160);
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        return scram.clientChallenge(connection, test_cnonce);
    }
}
