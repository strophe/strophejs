import { LOG_LEVELS, LogLevel } from './constants';

let logLevel = LOG_LEVELS.DEBUG;

const log = {
    /**
     * Library consumers can use this function to set the log level of Strophe.
     * The default log level is Strophe.LogLevel.INFO.
     * @param level
     * @example Strophe.setLogLevel(Strophe.LogLevel.DEBUG);
     */
    setLogLevel(level: LogLevel): void {
        if (level < LOG_LEVELS.DEBUG || level > LOG_LEVELS.FATAL) {
            throw new Error("Invalid log level supplied to setLogLevel");
        }
        logLevel = level;
    },

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
     * @param level - The log level of the log message.
     *     This will be one of the values in Strophe.LOG_LEVELS.
     * @param msg - The log message.
     */
    log(level: number, msg: string): void {
        if (level < logLevel) {
            return;
        }

        if (level >= LOG_LEVELS.ERROR) {
            console?.error(msg);
        } else if (level === LOG_LEVELS.INFO) {
            console?.info(msg);
        } else if (level === LOG_LEVELS.WARN) {
            console?.warn(msg);
        } else if (level === LOG_LEVELS.DEBUG) {
            console?.debug(msg);
        }
    },

    /**
     * Log a message at the Strophe.LOG_LEVELS.DEBUG level.
     * @param msg - The log message.
     */
    debug(msg: string): void {
        this.log(LOG_LEVELS.DEBUG, msg);
    },

    /**
     * Log a message at the Strophe.LOG_LEVELS.INFO level.
     * @param msg - The log message.
     */
    info(msg: string): void {
        this.log(LOG_LEVELS.INFO, msg);
    },

    /**
     * Log a message at the Strophe.LOG_LEVELS.WARN level.
     * @param msg - The log message.
     */
    warn(msg: string): void {
        this.log(LOG_LEVELS.WARN, msg);
    },

    /**
     * Log a message at the Strophe.LOG_LEVELS.ERROR level.
     * @param msg - The log message.
     */
    error(msg: string): void {
        this.log(LOG_LEVELS.ERROR, msg);
    },

    /**
     * Log a message at the Strophe.LOG_LEVELS.FATAL level.
     * @param msg - The log message.
     */
    fatal(msg: string): void {
        this.log(LOG_LEVELS.FATAL, msg);
    },
};

export default log;
