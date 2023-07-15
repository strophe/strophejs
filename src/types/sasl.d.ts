export default SASLMechanism;
export type Connection = import("./connection.js").default;
/**
 * @typedef {import("./connection.js").default} Connection
 */
/**
 * Encapsulates an SASL authentication mechanism.
 *
 * User code may override the priority for each mechanism or disable it completely.
 * See <priority> for information about changing priority and <test> for informatian on
 * how to disable a mechanism.
 *
 * By default, all mechanisms are enabled and t_he priorities are
 *
 *     SCRAM-SHA-512 - 72
 *     SCRAM-SHA-384 - 71
 *     SCRAM-SHA-256 - 70
 *     SCRAM-SHA-1   - 60
 *     PLAIN         - 50
 *     OAUTHBEARER   - 40
 *     X-OAUTH2      - 30
 *     ANONYMOUS     - 20
 *     EXTERNAL      - 10
 *
 * See: {@link Strophe.Connection#registerSASLMechanisms}
 */
declare class SASLMechanism {
    /**
     * PrivateConstructor: Strophe.SASLMechanism
     * SASL auth mechanism abstraction.
     * @param {String} [name] - SASL Mechanism name.
     * @param {Boolean} [isClientFirst] - If client should send response first without challenge.
     * @param {Number} [priority] - Priority.
     */
    constructor(name?: string, isClientFirst?: boolean, priority?: number);
    /** Mechanism name. */
    mechname: string;
    /**
     * If client sends response without initial server challenge.
     */
    isClientFirst: boolean;
    /**
     * Determines which {@link SASLMechanism} is chosen for authentication (Higher is better).
     * Users may override this to prioritize mechanisms differently.
     *
     * Example: (This will cause Strophe to choose the mechanism that the server sent first)
     *
     * > Strophe.SASLPlain.priority = Strophe.SASLSHA1.priority;
     *
     * See <SASL mechanisms> for a list of available mechanisms.
     */
    priority: number;
    /**
     * Checks if mechanism able to run.
     * To disable a mechanism, make this return false;
     *
     * To disable plain authentication run
     * > Strophe.SASLPlain.test = function() {
     * >   return false;
     * > }
     *
     * See <SASL mechanisms> for a list of available mechanisms.
     * @param {Connection} connection - Target Connection.
     * @return {boolean} If mechanism was able to run.
     */
    test(connection: Connection): boolean;
    /**
     * Called before starting mechanism on some connection.
     * @param {Connection} connection - Target Connection.
     */
    onStart(connection: Connection): void;
    _connection: import("./connection.js").default;
    /**
     * Called by protocol implementation on incoming challenge.
     *
     * By deafult, if the client is expected to send data first (isClientFirst === true),
     * this method is called with `challenge` as null on the first call,
     * unless `clientChallenge` is overridden in the relevant subclass.
     * @param {Connection} connection - Target Connection.
     * @param {string} [challenge] - current challenge to handle.
     * @return {string|Promise<string|false>} Mechanism response.
     */
    onChallenge(connection: Connection, challenge?: string): string | Promise<string | false>;
    /**
     * Called by the protocol implementation if the client is expected to send
     * data first in the authentication exchange (i.e. isClientFirst === true).
     * @param {Connection} connection - Target Connection.
     * @return {string|Promise<string|false>} Mechanism response.
     */
    clientChallenge(connection: Connection): string | Promise<string | false>;
    /**
     * Protocol informs mechanism implementation about SASL failure.
     */
    onFailure(): void;
    /**
     * Protocol informs mechanism implementation about SASL success.
     */
    onSuccess(): void;
}
//# sourceMappingURL=sasl.d.ts.map