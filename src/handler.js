import { Strophe } from './core';
import { forEachChild, getBareJidFromJid } from './utils';

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
 * @memberof Strophe
 */
class Handler {
    /**
     * Create and initialize a new Strophe.Handler.
     *
     * @param {Function} handler - A function to be executed when the handler is run.
     * @param {string} ns - The namespace to match.
     * @param {string} name - The element name to match.
     * @param {string|Array} type - The stanza type (or types if an array) to match.
     * @param {string} id - The element id attribute to match.
     * @param {string} [from] - The element from attribute to match.
     * @param {Object} [options] - Handler options
     */
    constructor(handler, ns, name, type, id, from, options) {
        this.handler = handler;
        this.ns = ns;
        this.name = name;
        this.type = type;
        this.id = id;
        this.options = options || { 'matchBareFromJid': false, 'ignoreNamespaceFragment': false };
        // BBB: Maintain backward compatibility with old `matchBare` option
        if (this.options.matchBare) {
            Strophe.warn('The "matchBare" option is deprecated, use "matchBareFromJid" instead.');
            this.options.matchBareFromJid = this.options.matchBare;
            delete this.options.matchBare;
        }
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
     * Tests if a stanza matches the namespace set for this Strophe.Handler.
     * @param {Element} elem - The XML element to test.
     * @return {boolean} - true if the stanza matches and false otherwise.
     */
    namespaceMatch(elem) {
        let nsMatch = false;
        if (!this.ns) {
            return true;
        } else {
            forEachChild(elem, null, (elem) => {
                if (this.getNamespace(elem) === this.ns) {
                    nsMatch = true;
                }
            });
            return nsMatch || this.getNamespace(elem) === this.ns;
        }
    }

    /**
     * Tests if a stanza matches the Strophe.Handler.
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
            (!this.name || Strophe.isTagEqual(elem, this.name)) &&
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
     * @param {Element} elem - The DOM element that triggered the Strophe.Handler.
     * @return {boolean} - A boolean indicating if the handler should remain active.
     */
    run(elem) {
        let result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            Strophe._handleError(e);
            throw e;
        }
        return result;
    }

    /**
     * Get a String representation of the Strophe.Handler object.
     * @return {string}
     */
    toString() {
        return '{Handler: ' + this.handler + '(' + this.name + ',' + this.id + ',' + this.ns + ')}';
    }
}

export default Handler;
