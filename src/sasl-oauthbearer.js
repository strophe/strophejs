import SASLMechanism from './sasl.js';
import utils from './utils';

export default class SASLOAuthBearer extends SASLMechanism {
    /** PrivateConstructor: SASLOAuthBearer
     *  SASL OAuth Bearer authentication.
     */
    constructor(mechname = 'OAUTHBEARER', isClientFirst = true, priority = 40) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.pass !== null;
    }

    // eslint-disable-next-line class-methods-use-this
    onChallenge(connection) {
        let auth_str = 'n,';
        if (connection.authcid !== null) {
            auth_str = auth_str + 'a=' + connection.authzid;
        }
        auth_str = auth_str + ',';
        auth_str = auth_str + '\u0001';
        auth_str = auth_str + 'auth=Bearer ';
        auth_str = auth_str + connection.pass;
        auth_str = auth_str + '\u0001';
        auth_str = auth_str + '\u0001';
        return utils.utf16to8(auth_str);
    }
}
