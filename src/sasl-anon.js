import SASLMechanism from './sasl.js';

// Building SASL callbacks

export default class SASLAnonymous extends SASLMechanism {

    /** PrivateConstructor: SASLAnonymous
     *  SASL ANONYMOUS authentication.
     */
    constructor (mechname='ANONYMOUS', isClientFirst=false, priority=20) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid === null;
    }
}
