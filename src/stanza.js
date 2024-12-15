import Builder from './builder.js';
import log from './log.js';
import { getFirstElementChild, getParserError, xmlHtmlNode, xmlescape } from './utils.js';

/**
 * @param {string} string
 * @param {boolean} [throwErrorIfInvalidNS]
 * @returns {Element}
 */
export function toStanzaElement(string, throwErrorIfInvalidNS) {
    const doc = xmlHtmlNode(string);
    const parserError = getParserError(doc);
    if (parserError) {
        throw new Error(`Parser Error: ${parserError}`);
    }

    const node = getFirstElementChild(doc);
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
 * A Stanza represents a XML element used in XMPP (commonly referred to as stanzas).
 */
export class Stanza extends Builder {
    /** @type {string} */
    #string;
    /** @type {Array<string>} */
    #strings;
    /**
     * @typedef {Array<string|Stanza|Builder>} StanzaValue
     * @type {StanzaValue|Array<StanzaValue>}
     */
    #values;

    /**
     * @param {string[]} strings
     * @param {any[]} values
     */
    constructor(strings, values) {
        super('stanza');
        this.#strings = strings;
        this.#values = values;
    }

    buildTree() {
        return toStanzaElement(this.toString(), true);
    }

    /**
     * @return {string}
     */
    toString() {
        this.#string =
            this.#string ||
            this.#strings
                .reduce((acc, str) => {
                    const idx = this.#strings.indexOf(str);
                    const value = this.#values.length > idx ? this.#values[idx] : '';
                    return (
                        acc +
                        str +
                        (Array.isArray(value)
                            ? value
                                  .map((v) =>
                                      v instanceof Stanza || v instanceof Builder ? v : xmlescape(v.toString())
                                  )
                                  .join('')
                            : value instanceof Stanza || value instanceof Builder
                              ? value
                              : xmlescape(value.toString()))
                    );
                }, '')
                .trim();

        return this.#string;
    }
}

/**
 * Tagged template literal function which generates {@link Stanza} objects
 *
 * @example
 *      const pres = stx`<presence type="${type}" xmlns="jabber:client"><show>${show}</show></presence>`
 *
 *      connection.send(msg);
 *
 * @example
 *      const msg = stx`<message
 *          from='sender@example.org'
 *          id='hgn27af1'
 *          to='recipient@example.org'
 *          type='chat'>
 *          <body>Hello world</body>
 *      </message>`;
 *
 *      connection.send(msg);
 *
 * @param {string[]} strings
 * @param {...any} values
 * @returns {Stanza}
 */
export function stx(strings, ...values) {
    return new Stanza(strings, values);
}
