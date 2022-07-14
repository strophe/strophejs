import SASLMechanism from './sasl.js';
import scram from './scram.js';

export default class SASLSHA512 extends SASLMechanism {

    /** PrivateConstructor: SASLSHA512
     *  SASL SCRAM SHA 512 authentication.
     */
    constructor (mechname='SCRAM-SHA-512', isClientFirst=true, priority=72) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    async onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this, require-await
        return scram.scramResponse(connection, challenge, "SHA-512", 512);
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        return scram.clientChallenge(connection, test_cnonce);
    }
}
