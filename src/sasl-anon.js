import SASLMechanism from './sasl.js';

class SASLAnonymous extends SASLMechanism {
    /**
     * SASL ANONYMOUS authentication.
     */
    constructor(mechname = 'ANONYMOUS', isClientFirst = false, priority = 20) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid === null;
    }
}

export default SASLAnonymous;
