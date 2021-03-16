import SASLMechanism from './sasl.js';
import utils from './utils';


export default class SASLPlain extends SASLMechanism {

    /** PrivateConstructor: SASLPlain
     *  SASL PLAIN authentication.
     */
    constructor (mechname='PLAIN', isClientFirst=true, priority=50) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    onChallenge (connection) { // eslint-disable-line class-methods-use-this
        const { authcid, authzid, domain, pass } = connection;
        if (!domain) {
            throw new Error("SASLPlain onChallenge: domain is not defined!");
        }
        // Only include authzid if it differs from authcid.
        // See: https://tools.ietf.org/html/rfc6120#section-6.3.8
        let auth_str = (authzid !== `${authcid}@${domain}`) ? authzid : '';
        auth_str = auth_str + "\u0000";
        auth_str = auth_str + authcid;
        auth_str = auth_str + "\u0000";
        auth_str = auth_str + pass;
        return utils.utf16to8(auth_str);
    }
}
