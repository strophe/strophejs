import type Connection from './connection';
import SASLMechanism from './sasl';

class SASLAnonymous extends SASLMechanism {
    constructor(mechname = 'ANONYMOUS', isClientFirst = false, priority = 20) {
        super(mechname, isClientFirst, priority);
    }

    test(connection: Connection): boolean {
        return connection.authcid === null;
    }
}

export default SASLAnonymous;
