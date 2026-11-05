import type Connection from './connection.js';
import SASLMechanism from './sasl.js';

class SASLExternal extends SASLMechanism {
    constructor(mechname = 'EXTERNAL', isClientFirst = true, priority = 10) {
        super(mechname, isClientFirst, priority);
    }

    onChallenge(connection: Connection): string {
        return connection.authcid === connection.authzid ? '' : connection.authzid;
    }
}

export default SASLExternal;
