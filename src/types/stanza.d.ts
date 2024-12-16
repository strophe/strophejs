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
export class Stanza extends Builder {
    /**
     * A directive which can be used to pass a string of XML as a value to the
     * stx tagged template literal.
     *
     * It's considered "unsafe" because it can pose a security risk if used with
     * untrusted input.
     *
     * @param {string} string
     * @returns {Builder}
     * @example
     *    const status = '<status>I am busy!</status>';
     *    const pres = stx`
     *       <presence from='juliet@example.com/chamber' id='pres1'>
     *           <show>dnd</show>
     *           ${unsafeXML(status)}
     *       </presence>`;
     *    connection.send(pres);
     */
    static unsafeXML(string: string): Builder;
    /**
     * Turns the passed-in string into an XML Element.
     * @param {string} string
     * @param {boolean} [throwErrorIfInvalidNS]
     * @returns {Element}
     */
    static toElement(string: string, throwErrorIfInvalidNS?: boolean): Element;
    /**
     * @param {string[]} strings
     * @param {any[]} values
     */
    constructor(strings: string[], values: any[]);
    #private;
}
import Builder from './builder.js';
//# sourceMappingURL=stanza.d.ts.map