import { getBareJidFromJid, handleError, isTagEqual } from './utils.js';

/**
 * _Private_ helper class for managing stanza handlers.
 *
 * A Handler encapsulates a user provided callback function to be
 * executed when matching stanzas are received by the connection.
 * Handlers can be either one-off or persistant depending on their
 * return value. Returning true will cause a Handler to remain active, and
 * returning false will remove the Handler.
 *
 * Users will not use Handler objects directly, but instead they
 * will use {@link Connection.addHandler} and
 * {@link Connection.deleteHandler}.
 */
class Handler {
    /**
     * @typedef {Object} HandlerOptions
     * @property {boolean} [HandlerOptions.matchBareFromJid]
     * @property {boolean} [HandlerOptions.ignoreNamespaceFragment]
     */

    /**
     * Create and initialize a new Handler.
     *
     * @param {Function} handler - A function to be executed when the handler is run.
     * @param {string} ns - The namespace to match.
     * @param {string} name - The element name to match.
     * @param {string|string[]} type - The stanza type (or types if an array) to match.
     * @param {string} [id] - The element id attribute to match.
     * @param {string} [from] - The element from attribute to match.
     * @param {HandlerOptions} [options] - Handler options
     */
    constructor(handler, ns, name, type, id, from, options) {
        this.handler = handler;
        this.ns = ns;
        this.name = name;
        this.type = type;
        this.id = id;
        this.options = options || { 'matchBareFromJid': false, 'ignoreNamespaceFragment': false };
        if (this.options.matchBareFromJid) {
            this.from = from ? getBareJidFromJid(from) : null;
        } else {
            this.from = from;
        }
        // whether the handler is a user handler or a system handler
        this.user = true;
    }

    /**
     * Returns the XML namespace attribute on an element.
     * If `ignoreNamespaceFragment` was passed in for this handler, then the
     * URL fragment will be stripped.
     * @param {Element} elem - The XML element with the namespace.
     * @return {string} - The namespace, with optionally the fragment stripped.
     */
    getNamespace(elem) {
        let elNamespace = elem.getAttribute('xmlns');
        if (elNamespace && this.options.ignoreNamespaceFragment) {
            elNamespace = elNamespace.split('#')[0];
        }
        return elNamespace;
    }

    /**
     * Tests if a stanza element (or any of its children) matches the
     * namespace set for this Handler.
     * @param {Element} elem - The XML element to test.
     * @return {boolean} - true if the stanza matches and false otherwise.
     */
    namespaceMatch(elem) {
        if (!this.ns || this.getNamespace(elem) === this.ns) {
            return true;
        }
        for (const child of elem.children ?? []) {
            if (this.getNamespace(child) === this.ns) {
                return true;
            } else if (this.namespaceMatch(child)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Tests if a stanza matches the Handler.
     * @param {Element} elem - The XML element to test.
     * @return {boolean} - true if the stanza matches and false otherwise.
     */
    isMatch(elem) {
        let from = elem.getAttribute('from');
        if (this.options.matchBareFromJid) {
            from = getBareJidFromJid(from);
        }
        const elem_type = elem.getAttribute('type');
        if (
            this.namespaceMatch(elem) &&
            (!this.name || isTagEqual(elem, this.name)) &&
            (!this.type ||
                (Array.isArray(this.type) ? this.type.indexOf(elem_type) !== -1 : elem_type === this.type)) &&
            (!this.id || elem.getAttribute('id') === this.id) &&
            (!this.from || from === this.from)
        ) {
            return true;
        }
        return false;
    }

    /**
     * Run the callback on a matching stanza.
     * @param {Element} elem - The DOM element that triggered the Handler.
     * @return {boolean} - A boolean indicating if the handler should remain active.
     */
    run(elem) {
        let result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            handleError(e);
            throw e;
        }
        return result;
    }

    /**
     * Get a String representation of the Handler object.
     * @return {string}
     */
    toString() {
        return '{Handler: ' + this.handler + '(' + this.name + ',' + this.id + ',' + this.ns + ')}';
    }
}

export default Handler;
