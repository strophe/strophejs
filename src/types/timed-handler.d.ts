export default TimedHandler;
/**
 * _Private_ helper class for managing timed handlers.
 *
 * A Strophe.TimedHandler encapsulates a user provided callback that
 * should be called after a certain period of time or at regular
 * intervals.  The return value of the callback determines whether the
 * Strophe.TimedHandler will continue to fire.
 *
 * Users will not use Strophe.TimedHandler objects directly, but instead
 * they will use {@link Strophe.Connection#addTimedHandler|addTimedHandler()} and
 * {@link Strophe.Connection#deleteTimedHandler|deleteTimedHandler()}.
 *
 * @memberof Strophe
 */
declare class TimedHandler {
    /**
     * Create and initialize a new Strophe.TimedHandler object.
     * @param {number} period - The number of milliseconds to wait before the
     *     handler is called.
     * @param {Function} handler - The callback to run when the handler fires.  This
     *     function should take no arguments.
     */
    constructor(period: number, handler: Function);
    period: number;
    handler: Function;
    lastCalled: number;
    user: boolean;
    /**
     * Run the callback for the Strophe.TimedHandler.
     *
     * @return {boolean} Returns the result of running the handler,
     *  which is `true` if the Strophe.TimedHandler should be called again,
     *  and `false` otherwise.
     */
    run(): boolean;
    /**
     * Reset the last called time for the Strophe.TimedHandler.
     */
    reset(): void;
    /**
     * Get a string representation of the Strophe.TimedHandler object.
     * @return {string}
     */
    toString(): string;
}
//# sourceMappingURL=timed-handler.d.ts.map