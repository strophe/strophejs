class SessionError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        this.name = 'StropheSessionError';
    }
}

export { SessionError };
