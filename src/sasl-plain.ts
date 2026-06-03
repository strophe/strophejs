import type Connection from './connection';
import SASLMechanism from './sasl';
import utils from './utils';

class SASLPlain extends SASLMechanism {
    constructor(mechname = 'PLAIN', isClientFirst = true, priority = 50) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.authcid !== null;
    }

    onChallenge(connection: Connection): string {
        const { authcid, authzid, domain, pass } = connection;
        if (!domain) {
            throw new Error('SASLPlain onChallenge: domain is not defined!');
        }
        let auth_str = authzid !== `${authcid}@${domain}` ? authzid : '';
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + authcid;
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + pass;
        return utils.utf16to8(auth_str);
    }
}

export default SASLPlain;
