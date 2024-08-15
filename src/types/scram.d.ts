export { scram as default };
export type Connection = import("./connection.js").default;
export type Password = {
    name: string;
    ck: string;
    sk: string;
    iter: number;
    salt: string;
};
declare namespace scram {
    /**
     * On success, sets
     * connection_sasl_data["server-signature"]
     * and
     * connection._sasl_data.keys
     *
     * The server signature should be verified after this function completes..
     *
     * On failure, returns connection._sasl_failure_cb();
     * @param {Connection} connection
     * @param {string} challenge
     * @param {string} hashName
     * @param {number} hashBits
     */
    function scramResponse(connection: Connection, challenge: string, hashName: string, hashBits: number): Promise<string | false>;
    /**
     * Returns a string containing the client first message
     * @param {Connection} connection
     * @param {string} test_cnonce
     */
    function clientChallenge(connection: Connection, test_cnonce: string): string;
}
//# sourceMappingURL=scram.d.ts.map