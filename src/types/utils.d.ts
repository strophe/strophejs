/**
 * Properly logs an error to the console
 * @param {Error} e
 */
export function handleError(e: Error): void;
/**
 * @param {string} str
 * @return {string}
 */
export function utf16to8(str: string): string;
/**
 * @param {ArrayBufferLike} x
 * @param {ArrayBufferLike} y
 */
export function xorArrayBuffers(x: ArrayBufferLike, y: ArrayBufferLike): ArrayBufferLike;
/**
 * @param {ArrayBufferLike} buffer
 * @return {string}
 */
export function arrayBufToBase64(buffer: ArrayBufferLike): string;
/**
 * @param {string} str
 * @return {ArrayBufferLike}
 */
export function base64ToArrayBuf(str: string): ArrayBufferLike;
/**
 * @param {string} str
 * @return {ArrayBufferLike}
 */
export function stringToArrayBuf(str: string): ArrayBufferLike;
/**
 * @param {Cookies} cookies
 */
export function addCookies(cookies: {
    [x: string]: string;
} | {
    [x: string]: {
        [x: string]: string;
    };
}): void;
/**
 * Get the DOM document to generate elements.
 * @return {Document} - The currently used DOM document.
 */
export function xmlGenerator(): Document;
/**
 * Creates an XML DOM text node.
 * Provides a cross implementation version of document.createTextNode.
 * @param {string} text - The content of the text node.
 * @return {Text} - A new XML DOM text node.
 */
export function xmlTextNode(text: string): Text;
/**
 * Creates an XML DOM node.
 * @param {string} html - The content of the html node.
 * @return {XMLDocument}
 */
export function xmlHtmlNode(html: string): XMLDocument;
/**
 * Create an XML DOM element.
 *
 * This function creates an XML DOM element correctly across all
 * implementations. Note that these are not HTML DOM elements, which
 * aren't appropriate for XMPP stanzas.
 *
 * @param {string} name - The name for the element.
 * @param {Array<Array<string>>|Object.<string,string|number>|string|number} [attrs]
 *    An optional array or object containing
 *    key/value pairs to use as element attributes.
 *    The object should be in the format `{'key': 'value'}`.
 *    The array should have the format `[['key1', 'value1'], ['key2', 'value2']]`.
 * @param {string|number} [text] - The text child data for the element.
 *
 * @return {Element} A new XML DOM element.
 */
export function xmlElement(name: string, attrs?: Array<Array<string>> | {
    [x: string]: string | number;
} | string | number, text?: string | number): Element;
/**
 * Utility method to determine whether a tag is allowed
 * in the XHTML_IM namespace.
 *
 * XHTML tag names are case sensitive and must be lower case.
 * @method Strophe.XHTML.validTag
 * @param {string} tag
 */
export function validTag(tag: string): boolean;
/**
 * @typedef {'a'|'blockquote'|'br'|'cite'|'em'|'img'|'li'|'ol'|'p'|'span'|'strong'|'ul'|'body'} XHTMLAttrs
 */
/**
 * Utility method to determine whether an attribute is allowed
 * as recommended per XEP-0071
 *
 * XHTML attribute names are case sensitive and must be lower case.
 * @method Strophe.XHTML.validAttribute
 * @param {string} tag
 * @param {string} attribute
 */
export function validAttribute(tag: string, attribute: string): boolean;
/**
 * @method Strophe.XHTML.validCSS
 * @param {string} style
 */
export function validCSS(style: string): boolean;
/**
 * Copy an HTML DOM Node into an XML DOM.
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @method Strophe.createHtml
 * @param {Node} node - A DOM element.
 * @return {Node} - A new, copied DOM element tree.
 */
export function createHtml(node: Node): Node;
/**
 * Copy an XML DOM element.
 *
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @method Strophe.copyElement
 * @param {Node} node - A DOM element.
 * @return {Element|Text} - A new, copied DOM element tree.
 */
export function copyElement(node: Node): Element | Text;
/**
 * Excapes invalid xml characters.
 * @method Strophe.xmlescape
 * @param {string} text - text to escape.
 * @return {string} - Escaped text.
 */
export function xmlescape(text: string): string;
/**
 * Unexcapes invalid xml characters.
 * @method Strophe.xmlunescape
 * @param {string} text - text to unescape.
 * @return {string} - Unescaped text.
 */
export function xmlunescape(text: string): string;
/**
 * Map a function over some or all child elements of a given element.
 *
 * This is a small convenience function for mapping a function over
 * some or all of the children of an element.  If elemName is null, all
 * children will be passed to the function, otherwise only children
 * whose tag names match elemName will be passed.
 *
 * @method Strophe.forEachChild
 * @param {Element} elem - The element to operate on.
 * @param {string} elemName - The child element tag name filter.
 * @param {Function} func - The function to apply to each child.  This
 *    function should take a single argument, a DOM element.
 */
export function forEachChild(elem: Element, elemName: string, func: Function): void;
/**
 * Compare an element's tag name with a string.
 * This function is case sensitive.
 * @method Strophe.isTagEqual
 * @param {Element} el - A DOM element.
 * @param {string} name - The element name.
 * @return {boolean}
 *  true if the element's tag name matches _el_, and false
 *  otherwise.
 */
export function isTagEqual(el: Element, name: string): boolean;
/**
 * Get the concatenation of all text children of an element.
 * @method Strophe.getText
 * @param {Element} elem - A DOM element.
 * @return {string} - A String with the concatenated text of all text element children.
 */
export function getText(elem: Element): string;
/**
 * Escape the node part (also called local part) of a JID.
 * @method Strophe.escapeNode
 * @param {string} node - A node (or local part).
 * @return {string} An escaped node (or local part).
 */
export function escapeNode(node: string): string;
/**
 * Unescape a node part (also called local part) of a JID.
 * @method Strophe.unescapeNode
 * @param {string} node - A node (or local part).
 * @return {string} An unescaped node (or local part).
 */
export function unescapeNode(node: string): string;
/**
 * Get the node portion of a JID String.
 * @method Strophe.getNodeFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the node.
 */
export function getNodeFromJid(jid: string): string;
/**
 * Get the domain portion of a JID String.
 * @method Strophe.getDomainFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the domain.
 */
export function getDomainFromJid(jid: string): string;
/**
 * Get the resource portion of a JID String.
 * @method Strophe.getResourceFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the resource.
 */
export function getResourceFromJid(jid: string): string;
/**
 * Get the bare JID from a JID String.
 * @method Strophe.getBareJidFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the bare JID.
 */
export function getBareJidFromJid(jid: string): string;
export { utils as default };
export type XHTMLAttrs = "a" | "blockquote" | "br" | "cite" | "em" | "img" | "li" | "ol" | "p" | "span" | "strong" | "ul" | "body";
declare namespace utils {
    export { utf16to8 };
    export { xorArrayBuffers };
    export { arrayBufToBase64 };
    export { base64ToArrayBuf };
    export { stringToArrayBuf };
    export { addCookies };
}
//# sourceMappingURL=utils.d.ts.map