/** Class: Strophe.SASLMechanism
 *
 *  Encapsulates an SASL authentication mechanism.
 *
 *  User code may override the priority for each mechanism or disable it completely.
 *  See <priority> for information about changing priority and <test> for informatian on
 *  how to disable a mechanism.
 *
 *  By default, all mechanisms are enabled and the priorities are
 *
 *      SCRAM-SHA-1 - 60
 *      PLAIN       - 50
 *      OAUTHBEARER - 40
 *      X-OAUTH2    - 30
 *      ANONYMOUS   - 20
 *      EXTERNAL    - 10
 *
 *  See: Strophe.Connection.addSupportedSASLMechanisms
 */
export default class SASLMechanism {

    /**
     * PrivateConstructor: Strophe.SASLMechanism
     * SASL auth mechanism abstraction.
     *
     *  Parameters:
     *    (String) name - SASL Mechanism name.
     *    (Boolean) isClientFirst - If client should send response first without challenge.
     *    (Number) priority - Priority.
     *
     *  Returns:
     *    A new Strophe.SASLMechanism object.
     */
    constructor (name, isClientFirst, priority) {
        /** PrivateVariable: mechname
         *  Mechanism name.
         */
        this.mechname = name;

        /** PrivateVariable: isClientFirst
         *  If client sends response without initial server challenge.
         */
        this.isClientFirst = isClientFirst;

        /** Variable: priority
         *  Determines which <SASLMechanism> is chosen for authentication (Higher is better).
         *  Users may override this to prioritize mechanisms differently.
         *
         *  Example: (This will cause Strophe to choose the mechanism that the server sent first)
         *
         *  > Strophe.SASLPlain.priority = Strophe.SASLSHA1.priority;
         *
         *  See <SASL mechanisms> for a list of available mechanisms.
         *
         */
        this.priority = priority;
    }

    /**
     *  Function: test
     *  Checks if mechanism able to run.
     *  To disable a mechanism, make this return false;
     *
     *  To disable plain authentication run
     *  > Strophe.SASLPlain.test = function() {
     *  >   return false;
     *  > }
     *
     *  See <SASL mechanisms> for a list of available mechanisms.
     *
     *  Parameters:
     *    (Strophe.Connection) connection - Target Connection.
     *
     *  Returns:
     *    (Boolean) If mechanism was able to run.
     */
    test () { // eslint-disable-line class-methods-use-this
        return true;
    }

    /** PrivateFunction: onStart
     *  Called before starting mechanism on some connection.
     *
     *  Parameters:
     *    (Strophe.Connection) connection - Target Connection.
     */
    onStart (connection) {
        this._connection = connection;
    }

    /** PrivateFunction: onChallenge
     *  Called by protocol implementation on incoming challenge.
     *
     *  By deafult, if the client is expected to send data first (isClientFirst === true),
     *  this method is called with `challenge` as null on the first call,
     *  unless `clientChallenge` is overridden in the relevant subclass.
     *
     *  Parameters:
     *    (Strophe.Connection) connection - Target Connection.
     *    (String) challenge - current challenge to handle.
     *
     *  Returns:
     *    (String) Mechanism response.
     */
    onChallenge (connection, challenge) {  // eslint-disable-line
        throw new Error("You should implement challenge handling!");
    }

    /** PrivateFunction: clientChallenge
     *  Called by the protocol implementation if the client is expected to send
     *  data first in the authentication exchange (i.e. isClientFirst === true).
     *
     *  Parameters:
     *    (Strophe.Connection) connection - Target Connection.
     *
     *  Returns:
     *    (String) Mechanism response.
     */
    clientChallenge (connection) {
        if (!this.isClientFirst) {
            throw new Error("clientChallenge should not be called if isClientFirst is false!");
        }
        return this.onChallenge(connection);
    }

    /** PrivateFunction: onFailure
     *  Protocol informs mechanism implementation about SASL failure.
     */
    onFailure () {
        this._connection = null;
    }

    /** PrivateFunction: onSuccess
     *  Protocol informs mechanism implementation about SASL success.
     */
    onSuccess () {
        this._connection = null;
    }
}
