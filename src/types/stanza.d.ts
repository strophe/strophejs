/**
 * @param {string} string
 * @param {boolean} [throwErrorIfInvalidNS]
 * @returns {Element}
 */
export function toStanzaElement(string: string, throwErrorIfInvalidNS?: boolean): Element;
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
export function stx(strings: string[], ...values: any[]): Stanza;
/**
 * A Stanza represents a XML element used in XMPP (commonly referred to as stanzas).
 */
export class Stanza {
    /**
     * @param {string[]} strings
     * @param {any[]} values
     */
    constructor(strings: string[], values: any[]);
    strings: string[];
    values: any[];
    /**
     * @return {string}
     */
    toString(): string;
    string: any;
    /**
     * @return {Element}
     */
    tree(): Element;
    node: any;
}
//# sourceMappingURL=stanza.d.ts.map