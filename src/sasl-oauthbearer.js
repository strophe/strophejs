import SASLMechanism from './sasl.js';
import utils from './utils';

export default class SASLOAuthBearer extends SASLMechanism {

    /** PrivateConstructor: SASLOAuthBearer
     *  SASL OAuth Bearer authentication.
     */
    constructor (mechname='OAUTHBEARER', isClientFirst=true, priority=40) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.pass !== null;
    }

    onChallenge (connection) {  // eslint-disable-line class-methods-use-this
        let auth_str = 'n,';
        if (connection.authcid !== null) {
            auth_str = auth_str + 'a=' + connection.authzid;
        }
        auth_str = auth_str + ',';
        auth_str = auth_str + "\u0001";
        auth_str = auth_str + 'auth=Bearer ';
        auth_str = auth_str + connection.pass;
        auth_str = auth_str + "\u0001";
        auth_str = auth_str + "\u0001";
        return utils.utf16to8(auth_str);
    }
}
