import { Strophe } from './core';
import { forEachChild, getBareJidFromJid } from './utils';

/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistant depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */

/** PrivateConstructor: Strophe.Handler
 *  Create and initialize a new Strophe.Handler.
 *
 *  Parameters:
 *    (Function) handler - A function to be executed when the handler is run.
 *    (String) ns - The namespace to match.
 *    (String) name - The element name to match.
 *    (String) type - The element type to match.
 *    (String) id - The element id attribute to match.
 *    (String) from - The element from attribute to match.
 *    (Object) options - Handler options
 *
 *  Returns:
 *    A new Strophe.Handler object.
 */

export default class Handler {
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

    /** PrivateFunction: getNamespace
     *  Returns the XML namespace attribute on an element.
     *  If `ignoreNamespaceFragment` was passed in for this handler, then the
     *  URL fragment will be stripped.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element with the namespace.
     *
     *  Returns:
     *    The namespace, with optionally the fragment stripped.
     */
    getNamespace(elem) {
        let elNamespace = elem.getAttribute('xmlns');
        if (elNamespace && this.options.ignoreNamespaceFragment) {
            elNamespace = elNamespace.split('#')[0];
        }
        return elNamespace;
    }

    /** PrivateFunction: namespaceMatch
     *  Tests if a stanza matches the namespace set for this Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
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

    /** PrivateFunction: isMatch
     *  Tests if a stanza matches the Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
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

    /** PrivateFunction: run
     *  Run the callback on a matching stanza.
     *
     *  Parameters:
     *    (XMLElement) elem - The DOM element that triggered the
     *      Strophe.Handler.
     *
     *  Returns:
     *    A boolean indicating if the handler should remain active.
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

    /** PrivateFunction: toString
     *  Get a String representation of the Strophe.Handler object.
     *
     *  Returns:
     *    A String.
     */
    toString() {
        return '{Handler: ' + this.handler + '(' + this.name + ',' + this.id + ',' + this.ns + ')}';
    }
}
