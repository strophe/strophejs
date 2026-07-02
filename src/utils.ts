import log from './log';
import { ElementType, PARSE_ERROR_NS, XHTML } from './constants';

export type XHTMLAttrs =
    | 'a'
    | 'blockquote'
    | 'br'
    | 'cite'
    | 'em'
    | 'img'
    | 'li'
    | 'ol'
    | 'p'
    | 'span'
    | 'strong'
    | 'ul'
    | 'body';

export interface CookieValue {
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
}

export type Cookies = Record<string, string | CookieValue>;

/**
 * Takes a string and turns it into an XML Element.
 * @param string
 * @param throwErrorIfInvalidNS
 * @returns
 */
export function toElement(string: string, throwErrorIfInvalidNS?: boolean): Element {
    const doc = xmlHtmlNode(string);
    const parserError = getParserError(doc);
    if (parserError) {
        throw new Error(`Parser Error: ${parserError}`);
    }

    const node = getFirstElementChild(doc)!;
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
 * Properly logs an error to the console
 * @param e
 */
export function handleError(e: Error): void {
    if (typeof e.stack !== 'undefined') {
        log.fatal(e.stack);
    }
    log.fatal('error: ' + e.message);
}

/**
 * @param str
 * @returns
 */
export function utf16to8(str: string): string {
    let out = '';
    const len = str.length;
    for (let i = 0; i < len; i++) {
        const c = str.charCodeAt(i);
        if (c >= 0x0000 && c <= 0x007f) {
            out += str.charAt(i);
        } else if (c > 0x07ff) {
            out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f));
            out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
            out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
        } else {
            out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f));
            out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
        }
    }
    return out;
}

/**
 * @param x
 * @param y
 * @returns
 */
export function xorArrayBuffers(x: ArrayBuffer, y: ArrayBuffer): ArrayBuffer {
    const xIntArray = new Uint8Array(x);
    const yIntArray = new Uint8Array(y);
    const zIntArray = new Uint8Array(x.byteLength);
    for (let i = 0; i < x.byteLength; i++) {
        zIntArray[i] = xIntArray[i] ^ yIntArray[i];
    }
    return zIntArray.buffer;
}

/**
 * @param buffer
 * @returns
 */
export function arrayBufToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * @param str
 * @returns
 */
export function base64ToArrayBuf(str: string): ArrayBuffer {
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))?.buffer!;
}

/**
 * @param str
 * @returns
 */
export function stringToArrayBuf(str: string): ArrayBuffer {
    const bytes = new TextEncoder().encode(str);
    return bytes.buffer;
}

/**
 * @param cookies
 */
export function addCookies(cookies?: Cookies): void {
    if (typeof document === 'undefined') {
        log.error(`addCookies: not adding any cookies, since there's no document object`);
        return;
    }

    const cookieMap = cookies || {};
    for (const cookieName in cookieMap) {
        if (Object.prototype.hasOwnProperty.call(cookieMap, cookieName)) {
            let expires = '';
            let domain = '';
            let path = '';
            const cookieObj = cookieMap[cookieName];
            const isObj = typeof cookieObj === 'object';
            const cookieValue = escape(unescape(isObj ? (cookieObj as CookieValue).value : (cookieObj as string)));
            if (isObj) {
                const cv = cookieObj as CookieValue;
                expires = cv.expires ? ';expires=' + cv.expires : '';
                domain = cv.domain ? ';domain=' + cv.domain : '';
                path = cv.path ? ';path=' + cv.path : '';
            }
            document.cookie = cookieName + '=' + cookieValue + expires + domain + path;
        }
    }
}

let _xmlGenerator: Document | null = null;

/**
 * Get the DOM document to generate elements.
 * @returns The currently used DOM document.
 */
export function xmlGenerator(): Document {
    if (!_xmlGenerator) {
        _xmlGenerator = document.implementation.createDocument('jabber:client', 'strophe', null);
    }
    return _xmlGenerator;
}

/**
 * Creates an XML DOM text node.
 * Provides a cross implementation version of document.createTextNode.
 * @param text - The content of the text node.
 * @returns A new XML DOM text node.
 */
export function xmlTextNode(text: string): Text {
    return xmlGenerator().createTextNode(text);
}

/**
 * @param stanza
 * @returns
 */
export function stripWhitespace(stanza: Element): Element {
    const childNodes = Array.from(stanza.childNodes);
    if (childNodes.length === 1 && childNodes[0].nodeType === ElementType.TEXT) {
        return stanza;
    }
    childNodes.forEach((node) => {
        if (node.nodeName.toLowerCase() === 'body') {
            return;
        }
        if (node.nodeType === ElementType.TEXT && !/\S/.test(node.nodeValue)) {
            stanza.removeChild(node);
        } else if (node.nodeType === ElementType.NORMAL) {
            stripWhitespace(node as Element);
        }
    });
    return stanza;
}

/**
 * Creates an XML DOM node.
 * @param text - The contents of the XML element.
 * @returns
 */
export function xmlHtmlNode(text: string): XMLDocument {
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/xml') as XMLDocument;
}

/**
 * @param doc
 * @returns
 */
export function getParserError(doc: XMLDocument): string | null {
    const el =
        doc.firstElementChild?.nodeName === 'parsererror'
            ? doc.firstElementChild
            : doc.getElementsByTagNameNS(PARSE_ERROR_NS, 'parsererror')[0];

    return el?.nodeName === 'parsererror' ? el?.textContent : null;
}

/**
 * @param el
 * @returns
 */
export function getFirstElementChild(el: XMLDocument): Element | null {
    if (el.firstElementChild) return el.firstElementChild;
    let node: Node | undefined;
    let i = 0;
    const nodes = el.childNodes;

    while ((node = nodes[i++])) {
        if (node.nodeType === 1) return node as Element;
    }
    return null;
}

type XmlElementAttrs = Array<Array<string>> | Record<string, string | number> | string | number;

/**
 * Create an XML DOM element.
 *
 * This function creates an XML DOM element correctly across all
 * implementations. Note that these are not HTML DOM elements, which
 * aren't appropriate for XMPP stanzas.
 *
 * @param name - The name for the element.
 * @param attrs
 *    An optional array or object containing
 *    key/value pairs to use as element attributes.
 *    The object should be in the format `{'key': 'value'}`.
 *    The array should have the format `[['key1', 'value1'], ['key2', 'value2']]`.
 * @param text - The text child data for the element.
 *
 * @returns A new XML DOM element.
 */
export function xmlElement(name: string, attrs?: XmlElementAttrs, text?: string | number): Element | null {
    if (!name) return null;

    const node = xmlGenerator().createElement(name);

    if (text && (typeof text === 'string' || typeof text === 'number')) {
        node.appendChild(xmlTextNode(text.toString()));
    } else if (typeof attrs === 'string' || typeof attrs === 'number') {
        node.appendChild(xmlTextNode(attrs.toString()));
        return node;
    }

    if (!attrs) {
        return node;
    } else if (Array.isArray(attrs)) {
        for (const attr of attrs) {
            if (Array.isArray(attr)) {
                if (attr[0] != null && attr[1] != null) {
                    node.setAttribute(attr[0], attr[1]);
                }
            }
        }
    } else if (typeof attrs === 'object') {
        for (const k of Object.keys(attrs)) {
            if (k && attrs[k] != null) {
                node.setAttribute(k, attrs[k].toString());
            }
        }
    }

    return node;
}

/**
 * Utility method to determine whether a tag is allowed
 * in the XHTML_IM namespace.
 *
 * XHTML tag names are case sensitive and must be lower case.
 * @method Strophe.XHTML.validTag
 * @param tag
 */
export function validTag(tag: string): boolean {
    for (let i = 0; i < XHTML.tags.length; i++) {
        if (tag === XHTML.tags[i]) {
            return true;
        }
    }
    return false;
}

/**
 * Utility method to determine whether an attribute is allowed
 * as recommended per XEP-0071
 *
 * XHTML attribute names are case sensitive and must be lower case.
 * @method Strophe.XHTML.validAttribute
 * @param tag
 * @param attribute
 */
export function validAttribute(tag: string, attribute: string): boolean {
    const attrs = XHTML.attributes[tag as XHTMLAttrs];

    if (attrs?.length > 0) {
        for (let i = 0; i < attrs.length; i++) {
            if (attribute === attrs[i]) {
                return true;
            }
        }
    }
    return false;
}

/**
 * @method Strophe.XHTML.validCSS
 * @param style
 */
export function validCSS(style: string): boolean {
    for (let i = 0; i < XHTML.css.length; i++) {
        if (style === XHTML.css[i]) {
            return true;
        }
    }
    return false;
}

/**
 * Copy an HTML DOM Element into an XML DOM.
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @param elem - A DOM element.
 * @returns A new, copied DOM element tree.
 */
function createFromHtmlElement(elem: HTMLElement): Node {
    let el: Node;
    const tag = elem.nodeName.toLowerCase();
    if (validTag(tag)) {
        try {
            el = xmlElement(tag)!;

            if (tag in XHTML.attributes) {
                const attrs = XHTML.attributes[tag as XHTMLAttrs];

                for (let i = 0; i < attrs.length; i++) {
                    const attribute = attrs[i];
                    let value = elem.getAttribute(attribute);

                    if (typeof value === 'undefined' || value === null || value === '') {
                        continue;
                    }

                    if (attribute === 'style' && typeof value === 'object') {
                        value = (value as CSSStyleDeclaration).cssText ?? value;
                    }

                    if (attribute === 'style') {
                        const css: string[] = [];
                        const cssAttrs = value.split(';');
                        for (let j = 0; j < cssAttrs.length; j++) {
                            const attr = cssAttrs[j].split(':');
                            const cssName = attr[0].replace(/^\s*/, '').replace(/\s*$/, '').toLowerCase();
                            if (validCSS(cssName)) {
                                const cssValue = attr[1].replace(/^\s*/, '').replace(/\s*$/, '');
                                css.push(cssName + ': ' + cssValue);
                            }
                        }
                        if (css.length > 0) {
                            value = css.join('; ');
                            (el as Element).setAttribute(attribute, value);
                        }
                    } else {
                        (el as Element).setAttribute(attribute, value);
                    }
                }
                for (let i = 0; i < elem.childNodes.length; i++) {
                    (el as Element).appendChild(createHtml(elem.childNodes[i])!);
                }
            }
        } catch (_e) {
            el = xmlTextNode('');
        }
    } else {
        el = xmlGenerator().createDocumentFragment();
        for (let i = 0; i < elem.childNodes.length; i++) {
            (el as DocumentFragment).appendChild(createHtml(elem.childNodes[i])!);
        }
    }
    return el;
}

/**
 * Copy an HTML DOM Node into an XML DOM.
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @method Strophe.createHtml
 * @param node - A DOM element.
 * @returns A new, copied DOM element tree.
 */
export function createHtml(node: Node): Node | undefined {
    if (node.nodeType === ElementType.NORMAL) {
        return createFromHtmlElement(node as HTMLElement);
    } else if (node.nodeType === ElementType.FRAGMENT) {
        const el = xmlGenerator().createDocumentFragment();
        for (let i = 0; i < node.childNodes.length; i++) {
            el.appendChild(createHtml(node.childNodes[i])!);
        }
        return el;
    } else if (node.nodeType === ElementType.TEXT) {
        return xmlTextNode(node.nodeValue);
    }
}

/**
 * Copy an XML DOM element.
 *
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @method Strophe.copyElement
 * @param node - A DOM element.
 * @returns A new, copied DOM element tree.
 */
export function copyElement(node: Node): Element | Text | undefined {
    let out: Element | Text | undefined;

    if (node.nodeType === ElementType.NORMAL) {
        const el = node as Element;
        out = xmlElement(el.tagName)!;

        for (let i = 0; i < el.attributes.length; i++) {
            out.setAttribute(el.attributes[i].nodeName, el.attributes[i].value);
        }
        for (let i = 0; i < el.childNodes.length; i++) {
            out.appendChild(copyElement(el.childNodes[i])!);
        }
    } else if (node.nodeType === ElementType.TEXT) {
        out = xmlGenerator().createTextNode(node.nodeValue);
    }
    return out;
}

/**
 * Excapes invalid xml characters.
 * @method Strophe.xmlescape
 * @param text - text to escape.
 * @returns Escaped text.
 */
export function xmlescape(text: string): string {
    return text
        .replace(/\&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');
}

/**
 * Unexcapes invalid xml characters.
 * @method Strophe.xmlunescape
 * @param text - text to unescape.
 * @returns Unescaped text.
 */
export function xmlunescape(text: string): string {
    text = text.replace(/\&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&quot;/g, '"');
    return text;
}

/**
 * Map a function over some or all child elements of a given element.
 *
 * This is a small convenience function for mapping a function over
 * some or all of the children of an element.  If elemName is null, all
 * children will be passed to the function, otherwise only children
 * whose tag names match elemName will be passed.
 *
 * @method Strophe.forEachChild
 * @param elem - The element to operate on.
 * @param elemName - The child element tag name filter.
 * @param func - The function to apply to each child.  This
 *    function should take a single argument, a DOM element.
 */
export function forEachChild(elem: Element, elemName: string, func: (child: Element) => void): void {
    for (let i = 0; i < elem.childNodes.length; i++) {
        const childNode = elem.childNodes[i];
        if (childNode.nodeType === ElementType.NORMAL && (!elemName || isTagEqual(childNode as Element, elemName))) {
            func(childNode as Element);
        }
    }
}

/**
 * Compare an element's tag name with a string.
 * This function is case sensitive.
 * @method Strophe.isTagEqual
 * @param el - A DOM element.
 * @param name - The element name.
 * @returns
 *  true if the element's tag name matches _el_, and false
 *  otherwise.
 */
export function isTagEqual(el: Element, name: string): boolean {
    return el.tagName === name;
}

/**
 * Get the concatenation of all text children of an element.
 * @method Strophe.getText
 * @param elem - A DOM element.
 * @returns A String with the concatenated text of all text element children.
 */
export function getText(elem: Node | null): string | null {
    if (!elem) return null;

    let str = '';
    if (!elem.childNodes.length && elem.nodeType === ElementType.TEXT) {
        str += elem.nodeValue;
    }

    for (const child of elem.childNodes) {
        if (child.nodeType === ElementType.TEXT) {
            str += child.nodeValue;
        }
    }
    return xmlescape(str);
}

/**
 * Escape the node part (also called local part) of a JID.
 * @method Strophe.escapeNode
 * @param node - A node (or local part).
 * @returns An escaped node (or local part).
 */
export function escapeNode(node: unknown): unknown {
    if (typeof node !== 'string') {
        return node;
    }
    return node
        .replace(/^\s+|\s+$/g, '')
        .replace(/\\/g, '\\5c')
        .replace(/ /g, '\\20')
        .replace(/\"/g, '\\22')
        .replace(/\&/g, '\\26')
        .replace(/\'/g, '\\27')
        .replace(/\//g, '\\2f')
        .replace(/:/g, '\\3a')
        .replace(/</g, '\\3c')
        .replace(/>/g, '\\3e')
        .replace(/@/g, '\\40');
}

/**
 * Unescape a node part (also called local part) of a JID.
 * @method Strophe.unescapeNode
 * @param node - A node (or local part).
 * @returns An unescaped node (or local part).
 */
export function unescapeNode(node: unknown): unknown {
    if (typeof node !== 'string') {
        return node;
    }
    return node
        .replace(/\\20/g, ' ')
        .replace(/\\22/g, '"')
        .replace(/\\26/g, '&')
        .replace(/\\27/g, "'")
        .replace(/\\2f/g, '/')
        .replace(/\\3a/g, ':')
        .replace(/\\3c/g, '<')
        .replace(/\\3e/g, '>')
        .replace(/\\40/g, '@')
        .replace(/\\5c/g, '\\');
}

/**
 * Get the node portion of a JID String.
 * @method Strophe.getNodeFromJid
 * @param jid - A JID.
 * @returns A String containing the node.
 */
export function getNodeFromJid(jid: string): string | null {
    if (jid.indexOf('@') < 0) {
        return null;
    }
    return jid.split('@')[0];
}

/**
 * Get the domain portion of a JID String.
 * @method Strophe.getDomainFromJid
 * @param jid - A JID.
 * @returns A String containing the domain.
 */
export function getDomainFromJid(jid: string): string | null {
    const bare = getBareJidFromJid(jid);
    if (bare!.indexOf('@') < 0) {
        return bare;
    } else {
        const parts = bare!.split('@');
        parts.splice(0, 1);
        return parts.join('@');
    }
}

/**
 * Get the resource portion of a JID String.
 * @method Strophe.getResourceFromJid
 * @param jid - A JID.
 * @returns A String containing the resource.
 */
export function getResourceFromJid(jid: string): string | null {
    if (!jid) {
        return null;
    }
    const s = jid.split('/');
    if (s.length < 2) {
        return null;
    }
    s.splice(0, 1);
    return s.join('/');
}

/**
 * Get the bare JID from a JID String.
 * @method Strophe.getBareJidFromJid
 * @param jid - A JID.
 * @returns A String containing the bare JID.
 */
export function getBareJidFromJid(jid: string): string | null {
    return jid ? jid.split('/')[0] : null;
}

const utils = {
    utf16to8,
    xorArrayBuffers,
    arrayBufToBase64,
    base64ToArrayBuf,
    stringToArrayBuf,
    addCookies,
};

export { utils as default };
