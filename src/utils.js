/* global btoa */
import log from './log.js';
import * as shims from './shims.js';
import { ElementType, XHTML } from './constants.js';

/**
 * Properly logs an error to the console
 * @param {Error} e
 */
export function handleError(e) {
    if (typeof e.stack !== 'undefined') {
        log.fatal(e.stack);
    }
    log.fatal('error: ' + e.message);
}

/**
 * @param {string} str
 * @return {string}
 */
export function utf16to8(str) {
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
 * @param {ArrayBufferLike} x
 * @param {ArrayBufferLike} y
 */
export function xorArrayBuffers(x, y) {
    const xIntArray = new Uint8Array(x);
    const yIntArray = new Uint8Array(y);
    const zIntArray = new Uint8Array(x.byteLength);
    for (let i = 0; i < x.byteLength; i++) {
        zIntArray[i] = xIntArray[i] ^ yIntArray[i];
    }
    return zIntArray.buffer;
}

/**
 * @param {ArrayBufferLike} buffer
 * @return {string}
 */
export function arrayBufToBase64(buffer) {
    // This function is due to mobz (https://stackoverflow.com/users/1234628/mobz)
    // and Emmanuel (https://stackoverflow.com/users/288564/emmanuel)
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * @param {string} str
 * @return {ArrayBufferLike}
 */
export function base64ToArrayBuf(str) {
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))?.buffer;
}

/**
 * @param {string} str
 * @return {ArrayBufferLike}
 */
export function stringToArrayBuf(str) {
    const bytes = new TextEncoder().encode(str);
    return bytes.buffer;
}

/**
 * @param {Cookies} cookies
 */
export function addCookies(cookies) {
    if (typeof document === 'undefined') {
        log.error(`addCookies: not adding any cookies, since there's no document object`);
    }

    /**
     * @typedef {Object.<string, string>} Cookie
     *
     * A map of cookie names to string values or to maps of cookie values.
     * @typedef {Cookie|Object.<string, Cookie>} Cookies
     *
     * For example:
     * { "myCookie": "1234" }
     *
     * or:
     * { "myCookie": {
     *    "value": "1234",
     *    "domain": ".example.org",
     *    "path": "/",
     *    "expires": expirationDate
     *    }
     * }
     *
     * These values get passed to {@link Strophe.Connection} via options.cookies
     */
    cookies = cookies || {};
    for (const cookieName in cookies) {
        if (Object.prototype.hasOwnProperty.call(cookies, cookieName)) {
            let expires = '';
            let domain = '';
            let path = '';
            const cookieObj = cookies[cookieName];
            const isObj = typeof cookieObj === 'object';
            const cookieValue = escape(unescape(isObj ? cookieObj.value : cookieObj));
            if (isObj) {
                expires = cookieObj.expires ? ';expires=' + cookieObj.expires : '';
                domain = cookieObj.domain ? ';domain=' + cookieObj.domain : '';
                path = cookieObj.path ? ';path=' + cookieObj.path : '';
            }
            document.cookie = cookieName + '=' + cookieValue + expires + domain + path;
        }
    }
}

/** @type {Document} */
let _xmlGenerator = null;

/**
 * Get the DOM document to generate elements.
 * @return {Document} - The currently used DOM document.
 */
export function xmlGenerator() {
    if (!_xmlGenerator) {
        _xmlGenerator = shims.getDummyXMLDOMDocument();
    }
    return _xmlGenerator;
}

/**
 * Creates an XML DOM text node.
 * Provides a cross implementation version of document.createTextNode.
 * @param {string} text - The content of the text node.
 * @return {Text} - A new XML DOM text node.
 */
export function xmlTextNode(text) {
    return xmlGenerator().createTextNode(text);
}

/**
 * Creates an XML DOM node.
 * @param {string} html - The content of the html node.
 * @return {XMLDocument}
 */
export function xmlHtmlNode(html) {
    const parser = new shims.DOMParser();
    return parser.parseFromString(html, 'text/xml');
}

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
export function xmlElement(name, attrs, text) {
    if (!name) return null;

    const node = xmlGenerator().createElement(name);

    if (text && (typeof text === 'string' || typeof text === 'number')) {
        node.appendChild(xmlTextNode(text.toString()));
    } else if (typeof attrs === 'string' || typeof attrs === 'number') {
        node.appendChild(xmlTextNode(/** @type {number|string} */ (attrs).toString()));
        return node;
    }

    if (!attrs) {
        return node;
    } else if (Array.isArray(attrs)) {
        for (const attr of attrs) {
            if (Array.isArray(attr)) {
                // eslint-disable-next-line no-eq-null
                if (attr[0] != null && attr[1] != null) {
                    node.setAttribute(attr[0], attr[1]);
                }
            }
        }
    } else if (typeof attrs === 'object') {
        for (const k of Object.keys(attrs)) {
            // eslint-disable-next-line no-eq-null
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
 * @param {string} tag
 */
export function validTag(tag) {
    for (let i = 0; i < XHTML.tags.length; i++) {
        if (tag === XHTML.tags[i]) {
            return true;
        }
    }
    return false;
}

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
export function validAttribute(tag, attribute) {
    const attrs = XHTML.attributes[/** @type {XHTMLAttrs} */ (tag)];

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
 * @param {string} style
 */
export function validCSS(style) {
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
 * @method Strophe.createHtml
 * @param {HTMLElement} elem - A DOM element.
 * @return {Node} - A new, copied DOM element tree.
 */
function createFromHtmlElement(elem) {
    let el;
    const tag = elem.nodeName.toLowerCase(); // XHTML tags must be lower case.
    if (validTag(tag)) {
        try {
            el = xmlElement(tag);

            if (tag in XHTML.attributes) {
                const attrs = XHTML.attributes[/** @type {XHTMLAttrs} */ (tag)];

                for (let i = 0; i < attrs.length; i++) {
                    const attribute = attrs[i];
                    let value = elem.getAttribute(attribute);

                    if (typeof value === 'undefined' || value === null || value === '') {
                        continue;
                    }

                    if (attribute === 'style' && typeof value === 'object') {
                        value = /** @type {Object.<'csstext',string>} */ (value).cssText ?? value; // we're dealing with IE, need to get CSS out
                    }

                    // filter out invalid css styles
                    if (attribute === 'style') {
                        const css = [];
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
                            el.setAttribute(attribute, value);
                        }
                    } else {
                        el.setAttribute(attribute, value);
                    }
                }
                for (let i = 0; i < elem.childNodes.length; i++) {
                    el.appendChild(createHtml(elem.childNodes[i]));
                }
            }
        } catch (e) {
            // invalid elements
            el = xmlTextNode('');
        }
    } else {
        el = xmlGenerator().createDocumentFragment();
        for (let i = 0; i < elem.childNodes.length; i++) {
            el.appendChild(createHtml(elem.childNodes[i]));
        }
    }
    return el;
}

/**
 * Copy an HTML DOM Node into an XML DOM.
 * This function copies a DOM element and all its descendants and returns
 * the new copy.
 * @method Strophe.createHtml
 * @param {Node} node - A DOM element.
 * @return {Node} - A new, copied DOM element tree.
 */
export function createHtml(node) {
    if (node.nodeType === ElementType.NORMAL) {
        return createFromHtmlElement(/** @type {HTMLElement} */ (node));
    } else if (node.nodeType === ElementType.FRAGMENT) {
        const el = xmlGenerator().createDocumentFragment();
        for (let i = 0; i < node.childNodes.length; i++) {
            el.appendChild(createHtml(node.childNodes[i]));
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
 * @param {Node} node - A DOM element.
 * @return {Element|Text} - A new, copied DOM element tree.
 */
export function copyElement(node) {
    let out;

    if (node.nodeType === ElementType.NORMAL) {
        const el = /** @type {Element} */ (node);
        out = xmlElement(el.tagName);

        for (let i = 0; i < el.attributes.length; i++) {
            out.setAttribute(el.attributes[i].nodeName, el.attributes[i].value);
        }
        for (let i = 0; i < el.childNodes.length; i++) {
            out.appendChild(copyElement(el.childNodes[i]));
        }
    } else if (node.nodeType === ElementType.TEXT) {
        out = xmlGenerator().createTextNode(node.nodeValue);
    }
    return out;
}

/**
 * Excapes invalid xml characters.
 * @method Strophe.xmlescape
 * @param {string} text - text to escape.
 * @return {string} - Escaped text.
 */
export function xmlescape(text) {
    text = text.replace(/\&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/'/g, '&apos;');
    text = text.replace(/"/g, '&quot;');
    return text;
}

/**
 * Unexcapes invalid xml characters.
 * @method Strophe.xmlunescape
 * @param {string} text - text to unescape.
 * @return {string} - Unescaped text.
 */
export function xmlunescape(text) {
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
 * @param {Element} elem - The element to operate on.
 * @param {string} elemName - The child element tag name filter.
 * @param {Function} func - The function to apply to each child.  This
 *    function should take a single argument, a DOM element.
 */
export function forEachChild(elem, elemName, func) {
    for (let i = 0; i < elem.childNodes.length; i++) {
        const childNode = elem.childNodes[i];
        if (childNode.nodeType === ElementType.NORMAL && (!elemName || this.isTagEqual(childNode, elemName))) {
            func(childNode);
        }
    }
}

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
export function isTagEqual(el, name) {
    return el.tagName === name;
}

/**
 * Get the concatenation of all text children of an element.
 * @method Strophe.getText
 * @param {Element} elem - A DOM element.
 * @return {string} - A String with the concatenated text of all text element children.
 */
export function getText(elem) {
    if (!elem) {
        return null;
    }

    let str = '';
    if (!elem.childNodes?.length && elem.nodeType === ElementType.TEXT) {
        str += elem.nodeValue;
    }
    for (let i = 0; i < elem.childNodes?.length ?? 0; i++) {
        if (elem.childNodes[i].nodeType === ElementType.TEXT) {
            str += elem.childNodes[i].nodeValue;
        }
    }
    return xmlescape(str);
}

/**
 * Escape the node part (also called local part) of a JID.
 * @method Strophe.escapeNode
 * @param {string} node - A node (or local part).
 * @return {string} An escaped node (or local part).
 */
export function escapeNode(node) {
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
 * @param {string} node - A node (or local part).
 * @return {string} An unescaped node (or local part).
 */
export function unescapeNode(node) {
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
 * @param {string} jid - A JID.
 * @return {string} - A String containing the node.
 */
export function getNodeFromJid(jid) {
    if (jid.indexOf('@') < 0) {
        return null;
    }
    return jid.split('@')[0];
}

/**
 * Get the domain portion of a JID String.
 * @method Strophe.getDomainFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the domain.
 */
export function getDomainFromJid(jid) {
    const bare = getBareJidFromJid(jid);
    if (bare.indexOf('@') < 0) {
        return bare;
    } else {
        const parts = bare.split('@');
        parts.splice(0, 1);
        return parts.join('@');
    }
}

/**
 * Get the resource portion of a JID String.
 * @method Strophe.getResourceFromJid
 * @param {string} jid - A JID.
 * @return {string} - A String containing the resource.
 */
export function getResourceFromJid(jid) {
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
 * @param {string} jid - A JID.
 * @return {string} - A String containing the bare JID.
 */
export function getBareJidFromJid(jid) {
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
