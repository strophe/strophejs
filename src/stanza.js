import log from './log.js';
import { xmlHtmlNode } from './utils.js';

const PARSE_ERROR_NS = 'http://www.w3.org/1999/xhtml';

/**
 * @param {string} string
 * @param {boolean} [throwErrorIfInvalidNS]
 * @return {Element}
 */
export function toStanza(string, throwErrorIfInvalidNS) {
    const doc = xmlHtmlNode(string);

    if (doc.getElementsByTagNameNS(PARSE_ERROR_NS, 'parsererror').length) {
        throw new Error(`Parser Error: ${string}`);
    }

    const node = doc.firstElementChild;

    if (
        ['message', 'iq', 'presence'].includes(node.nodeName.toLowerCase()) &&
        node.namespaceURI !== 'jabber:client' &&
        node.namespaceURI !== 'jabber:server'
    ) {
        const err_msg = `Invalid namespaceURI ${node.namespaceURI}`;
        if (throwErrorIfInvalidNS) {
            throw new Error(err_msg);
        } else {
            log.error(err_msg);
        }
    }
    return node;
}

/**
 * A Stanza represents a XML element used in XMPP (commonly referred to as
 * stanzas).
 */
export class Stanza {
    /**
     * @param { string[] } strings
     * @param { any[] } values
     */
    constructor(strings, values) {
        this.strings = strings;
        this.values = values;
    }

    /**
     * @return { string }
     */
    toString() {
        this.string =
            this.string ||
            this.strings.reduce((acc, str) => {
                const idx = this.strings.indexOf(str);
                const value = this.values.length > idx ? this.values[idx].toString() : '';
                return acc + str + value;
            }, '');
        return this.string;
    }

    /**
     * @return { Element }
     */
    tree() {
        this.node = this.node ?? toStanza(this.toString(), true);
        return this.node;
    }
}

/**
 * Tagged template literal function which generates {@link Stanza } objects
 * @example stx`<presence type="${type}" xmlns="jabber:client"><show>${show}</show></presence>`
 *
 * @param { string[] } strings
 * @param { ...any } values
 */
export function stx(strings, ...values) {
    return new Stanza(strings, values);
}
