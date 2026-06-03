import Builder from './builder';
import log from './log';
import { getFirstElementChild, getParserError, stripWhitespace, xmlHtmlNode, xmlescape } from './utils';

class UnsafeXML extends String {}

export type StanzaValue = string | Stanza | Builder;

/**
 * A Stanza represents a XML element used in XMPP (commonly referred to as stanzas).
 */
export class Stanza extends Builder {
    #string: string | undefined;
    #strings: string[];
    #values: StanzaValue[];

    /**
     * @param strings
     * @param values
     */
    constructor(strings: TemplateStringsArray, values: StanzaValue[]) {
        super('stanza');
        this.#strings = strings as unknown as string[];
        this.#values = values;
    }

    /**
     * A directive which can be used to pass a string of XML as a value to the
     * stx tagged template literal.
     *
     * It's considered "unsafe" because it can pose a security risk if used with
     * untrusted input.
     *
     * @param string
     * @returns
     * @example
     *    const status = '<status>I am busy!</status>';
     *    const pres = stx`
     *       <presence from='juliet@example.com/chamber' id='pres1'>
     *           <show>dnd</show>
     *           ${unsafeXML(status)}
     *       </presence>`;
     *    connection.send(pres);
     */
    static unsafeXML(string: string): UnsafeXML {
        return new UnsafeXML(string);
    }

    /**
     * Turns the passed-in string into an XML Element.
     * @param string
     * @param throwErrorIfInvalidNS
     * @returns
     */
    static toElement(string: string, throwErrorIfInvalidNS?: boolean): Element {
        const doc = xmlHtmlNode(string);
        const parserError = getParserError(doc);
        if (parserError) {
            throw new Error(`Parser Error: ${parserError}`);
        }

        const node = stripWhitespace(getFirstElementChild(doc) as Element);
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

    buildTree(): Element {
        return Stanza.toElement(this.toString(), true);
    }

    /**
     * @returns
     */
    toString(): string {
        this.#string =
            this.#string ||
            this.#strings
                .reduce((acc, str, idx) => {
                    const value = this.#values.length > idx ? this.#values[idx] : '';
                    return (
                        acc +
                        str +
                        (Array.isArray(value)
                            ? value
                                  .map((v) =>
                                      v instanceof UnsafeXML || v instanceof Builder
                                          ? v
                                          : xmlescape(v.toString())
                                  )
                                  .join('')
                            : value instanceof UnsafeXML || value instanceof Builder
                              ? value
                              : xmlescape((value ?? '').toString()))
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
 * @param strings
 * @param values
 * @returns
 */
export function stx(strings: TemplateStringsArray, ...values: StanzaValue[]): Stanza {
    return new Stanza(strings, values);
}
