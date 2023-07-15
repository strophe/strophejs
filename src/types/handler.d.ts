export default Handler;
/**
 * _Private_ helper class for managing stanza handlers.
 *
 * A Strophe.Handler encapsulates a user provided callback function to be
 * executed when matching stanzas are received by the connection.
 * Handlers can be either one-off or persistant depending on their
 * return value. Returning true will cause a Handler to remain active, and
 * returning false will remove the Handler.
 *
 * Users will not use Strophe.Handler objects directly, but instead they
 * will use {@link Strophe.Connection.addHandler} and
 * {@link Strophe.Connection.deleteHandler}.
 */
declare class Handler {
    /**
     * @typedef {Object} HandlerOptions
     * @property {boolean} [HandlerOptions.matchBareFromJid]
     * @property {boolean} [HandlerOptions.ignoreNamespaceFragment]
     */
    /**
     * Create and initialize a new Strophe.Handler.
     *
     * @param {Function} handler - A function to be executed when the handler is run.
     * @param {string} ns - The namespace to match.
     * @param {string} name - The element name to match.
     * @param {string|string[]} type - The stanza type (or types if an array) to match.
     * @param {string} [id] - The element id attribute to match.
     * @param {string} [from] - The element from attribute to match.
     * @param {HandlerOptions} [options] - Handler options
     */
    constructor(handler: Function, ns: string, name: string, type: string | string[], id?: string, from?: string, options?: {
        matchBareFromJid?: boolean;
        ignoreNamespaceFragment?: boolean;
    });
    handler: Function;
    ns: string;
    name: string;
    type: string | string[];
    id: string;
    options: {
        matchBareFromJid?: boolean;
        ignoreNamespaceFragment?: boolean;
    };
    from: string;
    user: boolean;
    /**
     * Returns the XML namespace attribute on an element.
     * If `ignoreNamespaceFragment` was passed in for this handler, then the
     * URL fragment will be stripped.
     * @param {Element} elem - The XML element with the namespace.
     * @return {string} - The namespace, with optionally the fragment stripped.
     */
    getNamespace(elem: Element): string;
    /**
     * Tests if a stanza matches the namespace set for this Strophe.Handler.
     * @param {Element} elem - The XML element to test.
     * @return {boolean} - true if the stanza matches and false otherwise.
     */
    namespaceMatch(elem: Element): boolean;
    /**
     * Tests if a stanza matches the Strophe.Handler.
     * @param {Element} elem - The XML element to test.
     * @return {boolean} - true if the stanza matches and false otherwise.
     */
    isMatch(elem: Element): boolean;
    /**
     * Run the callback on a matching stanza.
     * @param {Element} elem - The DOM element that triggered the Strophe.Handler.
     * @return {boolean} - A boolean indicating if the handler should remain active.
     */
    run(elem: Element): boolean;
    /**
     * Get a String representation of the Strophe.Handler object.
     * @return {string}
     */
    toString(): string;
}
//# sourceMappingURL=handler.d.ts.map