class SessionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StropheSessionError';
    }
}

/**
 * Thrown by a SASL mechanism's `onChallenge()` to fail the exchange on the
 * client's side. Strophe sends `<abort/>` and reports `Status.AUTHFAIL` with
 * `condition`.
 *
 * With the `disconnect` option, Strophe closes the stream instead of sending
 * `<abort/>`. That's for a server that can no longer be trusted, e.g. one
 * that failed to prove it knows the password.
 */
class SASLError extends Error {
    condition: string;
    disconnect: boolean;

    constructor(condition: string, message: string, options: { disconnect?: boolean } = {}) {
        super(message);
        this.name = 'StropheSASLError';
        this.condition = condition;
        this.disconnect = !!options.disconnect;
    }
}

export { SessionError, SASLError };
