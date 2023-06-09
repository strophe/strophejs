import SASLMechanism from './sasl.js';

// Building SASL callbacks

export default class SASLAnonymous extends SASLMechanism {
    /** PrivateConstructor: SASLAnonymous
     *  SASL ANONYMOUS authentication.
     */
    constructor(mechname = 'ANONYMOUS', isClientFirst = false, priority = 20) {
        super(mechname, isClientFirst, priority);
    }

    // eslint-disable-next-line class-methods-use-this
    test(connection) {
        return connection.authcid === null;
    }
}
