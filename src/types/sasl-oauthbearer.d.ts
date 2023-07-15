export default SASLOAuthBearer;
export type Connection = import("./connection.js").default;
declare class SASLOAuthBearer extends SASLMechanism {
    /**
     * @param {Connection} connection
     */
    onChallenge(connection: Connection): string;
}
import SASLMechanism from './sasl.js';
//# sourceMappingURL=sasl-oauthbearer.d.ts.map