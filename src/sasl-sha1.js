import MD5 from './md5';
import SASLMechanism from './sasl.js';
import utils from './utils';
import scramResponse from './scram.js'

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

    async onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this
        return await scramResponse(connection, challenge, "SHA-1", 160);
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        const cnonce = test_cnonce || MD5.hexdigest("" + (Math.random() * 1234567890));
        let auth_str = "n=" + utils.utf16to8(connection.authcid);
        auth_str += ",r=";
        auth_str += cnonce;
        connection._sasl_data.cnonce = cnonce;
        connection._sasl_data["client-first-message-bare"] = auth_str;
        auth_str = "n,," + auth_str;
        return auth_str;
    }
}
