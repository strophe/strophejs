import SASLMechanism from './sasl.js';

export default class SASLExternal extends SASLMechanism {

    /** PrivateConstructor: SASLExternal
     *  SASL EXTERNAL authentication.
     *
     *  The EXTERNAL mechanism allows a client to request the server to use
     *  credentials established by means external to the mechanism to
     *  authenticate the client. The external means may be, for instance,
     *  TLS services.
     */
    constructor (mechname='EXTERNAL', isClientFirst=true, priority=10) {
        super(mechname, isClientFirst, priority);
    }

    onChallenge (connection) { // eslint-disable-line class-methods-use-this
        /** According to XEP-178, an authzid SHOULD NOT be presented when the
         * authcid contained or implied in the client certificate is the JID (i.e.
         * authzid) with which the user wants to log in as.
         *
         * To NOT send the authzid, the user should therefore set the authcid equal
         * to the JID when instantiating a new Strophe.Connection object.
         */
        return connection.authcid === connection.authzid ? '' : connection.authzid;
    }
}
