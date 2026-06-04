import { getBareJidFromJid, handleError, isTagEqual } from './utils';

export interface HandlerOptions {
    matchBareFromJid?: boolean;
    ignoreNamespaceFragment?: boolean;
}

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
    handler: (stanza: Element) => boolean;
    ns: string;
    name: string;
    type: string | string[];
    id: string;
    from: string | null;
    options: HandlerOptions;
    user: boolean;

    /**
     * Create and initialize a new Handler.
     *
     * @param handler - A function to be executed when the handler is run.
     * @param ns - The namespace to match.
     * @param name - The element name to match.
     * @param type - The stanza type (or types if an array) to match.
     * @param id - The element id attribute to match.
     * @param from - The element from attribute to match.
     * @param options - Handler options
     */
    constructor(
        handler: ((stanza: Element) => boolean) | null,
        ns?: string | null,
        name?: string | null,
        type?: string | string[] | null,
        id?: string | null,
        from?: string | null,
        options?: HandlerOptions
    ) {
        this.handler = handler;
        this.ns = ns;
        this.name = name;
        this.type = type;
        this.id = id;
        this.options = options || { matchBareFromJid: false, ignoreNamespaceFragment: false };
        if (this.options.matchBareFromJid) {
            this.from = from ? getBareJidFromJid(from) : null;
        } else {
            this.from = from;
        }
        this.user = true;
    }

    /**
     * Returns the XML namespace attribute on an element.
     * If `ignoreNamespaceFragment` was passed in for this handler, then the
     * URL fragment will be stripped.
     * @param elem - The XML element with the namespace.
     * @returns The namespace, with optionally the fragment stripped.
     */
    getNamespace(elem: Element): string | null {
        let elNamespace = elem.getAttribute('xmlns');
        if (elNamespace && this.options.ignoreNamespaceFragment) {
            elNamespace = elNamespace.split('#')[0];
        }
        return elNamespace;
    }

    /**
     * Tests if a stanza element (or any of its children) matches the
     * namespace set for this Handler.
     * @param elem - The XML element to test.
     * @returns true if the stanza matches and false otherwise.
     */
    namespaceMatch(elem: Element): boolean {
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
     * @param elem - The XML element to test.
     * @returns true if the stanza matches and false otherwise.
     */
    isMatch(elem: Element): boolean {
        let from = elem.getAttribute('from');
        if (this.options.matchBareFromJid) {
            from = getBareJidFromJid(from);
        }
        const elem_type = elem.getAttribute('type');
        if (
            this.namespaceMatch(elem) &&
            (!this.name || isTagEqual(elem, this.name)) &&
            (!this.type ||
                (Array.isArray(this.type) ? this.type.indexOf(elem_type ?? '') !== -1 : elem_type === this.type)) &&
            (!this.id || elem.getAttribute('id') === this.id) &&
            (!this.from || from === this.from)
        ) {
            return true;
        }
        return false;
    }

    /**
     * Run the callback on a matching stanza.
     * @param elem - The DOM element that triggered the Handler.
     * @returns A boolean indicating if the handler should remain active.
     */
    run(elem: Element): boolean | null {
        let result: boolean | null = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            handleError(e as Error);
            throw e;
        }
        return result;
    }

    /**
     * Get a String representation of the Handler object.
     */
    toString(): string {
        return '{Handler: ' + this.handler + '(' + this.name + ',' + this.id + ',' + this.ns + ')}';
    }
}

export default Handler;
