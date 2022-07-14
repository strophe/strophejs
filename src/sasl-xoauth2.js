import SASLMechanism from './sasl.js';
import utils from './utils';


export default class SASLXOAuth2 extends SASLMechanism {

    /** PrivateConstructor: SASLXOAuth2
     *  SASL X-OAuth2 authentication.
     */
    constructor (mechname='X-OAUTH2', isClientFirst=true, priority=30) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.pass !== null;
    }

    onChallenge (connection) { // eslint-disable-line class-methods-use-this
        let auth_str = '\u0000';
        if (connection.authcid !== null) {
            auth_str = auth_str + connection.authzid;
        }
        auth_str = auth_str + "\u0000";
        auth_str = auth_str + connection.pass;
        return utils.utf16to8(auth_str);
    }
}
