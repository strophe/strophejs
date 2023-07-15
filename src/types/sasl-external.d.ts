export default SASLExternal;
export type Connection = import("./connection.js").default;
declare class SASLExternal extends SASLMechanism {
    /**
     * @param {Connection} connection
     */
    onChallenge(connection: Connection): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-external.d.ts.map