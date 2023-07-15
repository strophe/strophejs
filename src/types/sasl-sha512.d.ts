export default SASLSHA512;
export type Connection = import("./connection.js").default;
declare class SASLSHA512 extends SASLMechanism {
    /**
     * @param {Connection} connection
     * @param {string} [challenge]
     */
    onChallenge(connection: Connection, challenge?: string): Promise<string | false>;
    /**
     * @param {Connection} connection
     * @param {string} [test_cnonce]
     */
    clientChallenge(connection: Connection, test_cnonce?: string): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-sha512.d.ts.map