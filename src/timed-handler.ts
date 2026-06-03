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
class TimedHandler {
    period: number;
    handler: () => boolean;
    lastCalled: number;
    user: boolean;

    /**
     * Create and initialize a new Strophe.TimedHandler object.
     * @param period - The number of milliseconds to wait before the
     *     handler is called.
     * @param handler - The callback to run when the handler fires.  This
     *     function should take no arguments.
     */
    constructor(period: number, handler: () => boolean) {
        this.period = period;
        this.handler = handler;
        this.lastCalled = new Date().getTime();
        this.user = true;
    }

    /**
     * Run the callback for the Strophe.TimedHandler.
     *
     * @returns Returns the result of running the handler,
     *  which is `true` if the Strophe.TimedHandler should be called again,
     *  and `false` otherwise.
     */
    run(): boolean {
        this.lastCalled = new Date().getTime();
        return this.handler();
    }

    /**
     * Reset the last called time for the Strophe.TimedHandler.
     */
    reset(): void {
        this.lastCalled = new Date().getTime();
    }

    /**
     * Get a string representation of the Strophe.TimedHandler object.
     */
    toString(): string {
        return '{TimedHandler: ' + this.handler + '(' + this.period + ')}';
    }
}

export default TimedHandler;
