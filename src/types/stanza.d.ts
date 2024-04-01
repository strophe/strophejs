/**
 * @param {string} string
 * @param {boolean} [throwErrorIfInvalidNS]
 * @return {Element}
 */
export function toStanza(string: string, throwErrorIfInvalidNS?: boolean): Element;
/**
 * Tagged template literal function which generates {@link Stanza } objects
 * @example stx`<presence type="${type}" xmlns="jabber:client"><show>${show}</show></presence>`
 *
 * @param { string[] } strings
 * @param { ...any } values
 */
export function stx(strings: string[], ...values: any[]): Stanza;
/**
 * A Stanza represents a XML element used in XMPP (commonly referred to as
 * stanzas).
 */
export class Stanza {
    /**
     * @param { string[] } strings
     * @param { any[] } values
     */
    constructor(strings: string[], values: any[]);
    strings: string[];
    values: any[];
    /**
     * @return { string }
     */
    toString(): string;
    string: any;
    /**
     * @return { Element }
     */
    tree(): Element;
    node: any;
}
//# sourceMappingURL=stanza.d.ts.map