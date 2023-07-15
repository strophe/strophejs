export default SASLPlain;
export type Connection = import("./connection.js").default;
declare class SASLPlain extends SASLMechanism {
    /**
     * @param {Connection} connection
     */
    onChallenge(connection: Connection): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-plain.d.ts.map