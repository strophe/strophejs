export default SASLSHA1;
export type Connection = import("./connection.js").default;
declare class SASLSHA1 extends SASLMechanism {
    /**
     * @param {Connection} connection
     * @param {string} [challenge]
     * @return {Promise<string|false>} Mechanism response.
     */
    onChallenge(connection: Connection, challenge?: string): Promise<string | false>;
    /**
     * @param {Connection} connection
     * @param {string} [test_cnonce]
     */
    clientChallenge(connection: Connection, test_cnonce?: string): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-sha1.d.ts.map