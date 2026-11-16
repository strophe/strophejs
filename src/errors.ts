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
 */
class SASLError extends Error {
    condition: string;

    constructor(condition: string, message: string) {
        super(message);
        this.name = 'StropheSASLError';
        this.condition = condition;
    }
}

export { SessionError, SASLError };
