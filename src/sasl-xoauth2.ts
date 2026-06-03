import type Connection from './connection';
import SASLMechanism from './sasl';
import utils from './utils';

class SASLXOAuth2 extends SASLMechanism {
    constructor(mechname = 'X-OAUTH2', isClientFirst = true, priority = 30) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.pass !== null;
    }

    onChallenge(connection: Connection): string {
        let auth_str = '\u0000';
        if (connection.authcid !== null) {
            auth_str = auth_str + connection.authzid;
        }
        auth_str = auth_str + '\u0000';
        auth_str = auth_str + connection.pass;
        return utils.utf16to8(auth_str);
    }
}

export default SASLXOAuth2;
