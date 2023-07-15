export default SASLXOAuth2;
export type Connection = import("./connection.js").default;
/**
 * @typedef {import("./connection.js").default} Connection
 */
declare class SASLXOAuth2 extends SASLMechanism {
    /**
     * @param {Connection} connection
     */
    onChallenge(connection: Connection): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-xoauth2.d.ts.map