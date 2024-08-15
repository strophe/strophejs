export default log;
export type LogLevel = import("./constants").LogLevel;
declare namespace log {
    /**
     * Library consumers can use this function to set the log level of Strophe.
     * The default log level is Strophe.LogLevel.INFO.
     * @param {LogLevel} level
     * @example Strophe.setLogLevel(Strophe.LogLevel.DEBUG);
     */
    function setLogLevel(level: LogLevel): void;
    /**
     *
     * Please note that data sent and received over the wire is logged
     * via {@link Strophe.Connection#rawInput|Strophe.Connection.rawInput()}
     * and {@link Strophe.Connection#rawOutput|Strophe.Connection.rawOutput()}.
     *
     * The different levels and their meanings are
     *
     *   DEBUG - Messages useful for debugging purposes.
     *   INFO - Informational messages.  This is mostly information like
     *     'disconnect was called' or 'SASL auth succeeded'.
     *   WARN - Warnings about potential problems.  This is mostly used
     *     to report transient connection errors like request timeouts.
     *   ERROR - Some error occurred.
     *   FATAL - A non-recoverable fatal error occurred.
     *
     * @param {number} level - The log level of the log message.
     *     This will be one of the values in Strophe.LOG_LEVELS.
     * @param {string} msg - The log message.
     */
    function log(level: number, msg: string): void;
    /**
     * Log a message at the Strophe.LOG_LEVELS.DEBUG level.
     * @param {string} msg - The log message.
     */
    function debug(msg: string): void;
    /**
     * Log a message at the Strophe.LOG_LEVELS.INFO level.
     * @param {string} msg - The log message.
     */
    function info(msg: string): void;
    /**
     * Log a message at the Strophe.LOG_LEVELS.WARN level.
     * @param {string} msg - The log message.
     */
    function warn(msg: string): void;
    /**
     * Log a message at the Strophe.LOG_LEVELS.ERROR level.
     * @param {string} msg - The log message.
     */
    function error(msg: string): void;
    /**
     * Log a message at the Strophe.LOG_LEVELS.FATAL level.
     * @param {string} msg - The log message.
     */
    function fatal(msg: string): void;
}
//# sourceMappingURL=log.d.ts.map