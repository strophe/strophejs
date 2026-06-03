import type Connection from './connection';
import SASLMechanism from './sasl';
import utils from './utils';

class SASLOAuthBearer extends SASLMechanism {
    constructor(mechname = 'OAUTHBEARER', isClientFirst = true, priority = 40) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.pass !== null;
    }

    onChallenge(connection: Connection): string {
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

export default SASLOAuthBearer;
