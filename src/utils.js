/* global ActiveXObject */
import * as shims from './shims';
import { ElementType, XHTML } from './constants.js';

export function utf16to8 (str) {
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

export function xorArrayBuffers (x, y) {
    const xIntArray = new Uint8Array(x);
    const yIntArray = new Uint8Array(y);
    const zIntArray = new Uint8Array(x.byteLength);
    for (let i = 0; i < x.byteLength; i++) {
        zIntArray[i] = xIntArray[i] ^ yIntArray[i];
    }
    return zIntArray.buffer;
}

export function arrayBufToBase64 (buffer) {
    // This function is due to mobz (https://stackoverflow.com/users/1234628/mobz)
    // and Emmanuel (https://stackoverflow.com/users/288564/emmanuel)
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToArrayBuf (str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0))?.buffer;
}

export function stringToArrayBuf (str) {
    const bytes = new TextEncoder('utf-8').encode(str);
    return bytes.buffer;
}

export function addCookies (cookies) {
    /* Parameters:
     *  (Object) cookies - either a map of cookie names
     *    to string values or to maps of cookie values.
     *
     * For example:
     * { "myCookie": "1234" }
     *
     * or:
     * { "myCookie": {
     *      "value": "1234",
     *      "domain": ".example.org",
     *      "path": "/",
     *      "expires": expirationDate
     *      }
     *  }
     *
     *  These values get passed to Strophe.Connection via
     *   options.cookies
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

let _xmlGenerator = null;

/** Function: Strophe.xmlGenerator
 *  Get the DOM document to generate elements.
 *
 *  Returns:
 *    The currently used DOM document.
 */
export function xmlGenerator () {
    if (!_xmlGenerator) {
        _xmlGenerator = shims.getDummyXMLDOMDocument();
    }
    return _xmlGenerator;
}

/** Function: Strophe.xmlTextNode
 *  Creates an XML DOM text node.
 *
 *  Provides a cross implementation version of document.createTextNode.
 *
 *  Parameters:
 *    (String) text - The content of the text node.
 *
 *  Returns:
 *    A new XML DOM text node.
 */
export function xmlTextNode (text) {
    return xmlGenerator().createTextNode(text);
}

/** Function: Strophe.xmlHtmlNode
 *  Creates an XML DOM html node.
 *
 *  Parameters:
 *    (String) html - The content of the html node.
 *
 *  Returns:
 *    A new XML DOM text node.
 */
export function xmlHtmlNode (html) {
    let node;
    //ensure text is escaped
    if (shims.DOMParser) {
        const parser = new shims.DOMParser();
        node = parser.parseFromString(html, 'text/xml');
    } else {
        node = new ActiveXObject('Microsoft.XMLDOM');
        node.async = 'false';
        node.loadXML(html);
    }
    return node;
}

/** Function: Strophe.xmlElement
 *  Create an XML DOM element.
 *
 *  This function creates an XML DOM element correctly across all
 *  implementations. Note that these are not HTML DOM elements, which
 *  aren't appropriate for XMPP stanzas.
 *
 *  Parameters:
 *    (String) name - The name for the element.
 *    (Array|Object) attrs - An optional array or object containing
 *      key/value pairs to use as element attributes. The object should
 *      be in the format {'key': 'value'} or {key: 'value'}. The array
 *      should have the format [['key1', 'value1'], ['key2', 'value2']].
 *    (String) text - The text child data for the element.
 *
 *  Returns:
 *    A new XML DOM element.
 */
export function xmlElement (name) {
    if (!name) {
        return null;
    }

    const node = xmlGenerator().createElement(name);
    // FIXME: this should throw errors if args are the wrong type or
    // there are more than two optional args
    for (let a = 1; a < arguments.length; a++) {
        const arg = arguments[a];
        if (!arg) {
            continue;
        }
        if (typeof arg === 'string' || typeof arg === 'number') {
            node.appendChild(xmlTextNode(arg));
        } else if (typeof arg === 'object' && typeof arg.sort === 'function') {
            for (let i = 0; i < arg.length; i++) {
                const attr = arg[i];
                if (
                    typeof attr === 'object' &&
                    typeof attr.sort === 'function' &&
                    attr[1] !== undefined &&
                    attr[1] !== null
                ) {
                    node.setAttribute(attr[0], attr[1]);
                }
            }
        } else if (typeof arg === 'object') {
            for (const k in arg) {
                if (Object.prototype.hasOwnProperty.call(arg, k) && arg[k] !== undefined && arg[k] !== null) {
                    node.setAttribute(k, arg[k]);
                }
            }
        }
    }
    return node;
}

/** Function: Strophe.XHTML.validTag
 *
 * Utility method to determine whether a tag is allowed
 * in the XHTML_IM namespace.
 *
 * XHTML tag names are case sensitive and must be lower case.
 */
export function validTag (tag) {
    for (let i = 0; i < XHTML.tags.length; i++) {
        if (tag === XHTML.tags[i]) {
            return true;
        }
    }
    return false;
}

/** Function: Strophe.XHTML.validAttribute
 *
 * Utility method to determine whether an attribute is allowed
 * as recommended per XEP-0071
 *
 * XHTML attribute names are case sensitive and must be lower case.
 */
export function validAttribute (tag, attribute) {
    if (typeof XHTML.attributes[tag] !== 'undefined' && XHTML.attributes[tag].length > 0) {
        for (let i = 0; i < XHTML.attributes[tag].length; i++) {
            if (attribute === XHTML.attributes[tag][i]) {
                return true;
            }
        }
    }
    return false;
}

/** Function: Strophe.XHTML.validCSS */
export function validCSS (style) {
    for (let i = 0; i < XHTML.css.length; i++) {
        if (style === XHTML.css[i]) {
            return true;
        }
    }
    return false;
}

/** Function: Strophe.createHtml
 *
 *  Copy an HTML DOM element into an XML DOM.
 *
 *  This function copies a DOM element and all its descendants and returns
 *  the new copy.
 *
 *  Parameters:
 *    (HTMLElement) elem - A DOM element.
 *
 *  Returns:
 *    A new, copied DOM element tree.
 */
export function createHtml (elem) {
    let el;
    if (elem.nodeType === ElementType.NORMAL) {
        const tag = elem.nodeName.toLowerCase(); // XHTML tags must be lower case.
        if (XHTML.validTag(tag)) {
            try {
                el = xmlElement(tag);
                for (let i = 0; i < XHTML.attributes[tag].length; i++) {
                    const attribute = XHTML.attributes[tag][i];
                    let value = elem.getAttribute(attribute);
                    if (
                        typeof value === 'undefined' ||
                        value === null ||
                        value === '' ||
                        value === false ||
                        value === 0
                    ) {
                        continue;
                    }
                    if (attribute === 'style' && typeof value === 'object' && typeof value.cssText !== 'undefined') {
                        value = value.cssText; // we're dealing with IE, need to get CSS out
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
    } else if (elem.nodeType === ElementType.FRAGMENT) {
        el = xmlGenerator().createDocumentFragment();
        for (let i = 0; i < elem.childNodes.length; i++) {
            el.appendChild(createHtml(elem.childNodes[i]));
        }
    } else if (elem.nodeType === ElementType.TEXT) {
        el = xmlTextNode(elem.nodeValue);
    }
    return el;
}

/** Function: Strophe.copyElement
 *  Copy an XML DOM element.
 *
 *  This function copies a DOM element and all its descendants and returns
 *  the new copy.
 *
 *  Parameters:
 *    (XMLElement) elem - A DOM element.
 *
 *  Returns:
 *    A new, copied DOM element tree.
 */
export function copyElement (elem) {
    let el;
    if (elem.nodeType === ElementType.NORMAL) {
        el = xmlElement(elem.tagName);

        for (let i = 0; i < elem.attributes.length; i++) {
            el.setAttribute(elem.attributes[i].nodeName, elem.attributes[i].value);
        }

        for (let i = 0; i < elem.childNodes.length; i++) {
            el.appendChild(copyElement(elem.childNodes[i]));
        }
    } else if (elem.nodeType === ElementType.TEXT) {
        el = xmlGenerator().createTextNode(elem.nodeValue);
    }
    return el;
}

/*  Function: Strophe.xmlescape
 *  Excapes invalid xml characters.
 *
 *  Parameters:
 *     (String) text - text to escape.
 *
 *  Returns:
 *      Escaped text.
 */
export function xmlescape (text) {
    text = text.replace(/\&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    text = text.replace(/'/g, '&apos;');
    text = text.replace(/"/g, '&quot;');
    return text;
}

/*  Function: Strophe.xmlunescape
 *  Unexcapes invalid xml characters.
 *
 *  Parameters:
 *     (String) text - text to unescape.
 *
 *  Returns:
 *      Unescaped text.
 */
export function xmlunescape (text) {
    text = text.replace(/\&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&quot;/g, '"');
    return text;
}

/** Function: Strophe.serialize
 *  Render a DOM element and all descendants to a String.
 *
 *  Parameters:
 *    (XMLElement) elem - A DOM element.
 *
 *  Returns:
 *    The serialized element tree as a String.
 */
export function serialize (elem) {
    if (!elem) {
        return null;
    }
    if (typeof elem.tree === 'function') {
        elem = elem.tree();
    }
    const names = [...Array(elem.attributes.length).keys()].map(i => elem.attributes[i].nodeName);
    names.sort();
    let result = names.reduce(
        (a, n) => `${a} ${n}="${xmlescape(elem.attributes.getNamedItem(n).value)}"`,
        `<${elem.nodeName}`
    );

    if (elem.childNodes.length > 0) {
        result += '>';
        for (let i = 0; i < elem.childNodes.length; i++) {
            const child = elem.childNodes[i];
            switch (child.nodeType) {
                case ElementType.NORMAL:
                    // normal element, so recurse
                    result += serialize(child);
                    break;
                case ElementType.TEXT:
                    // text element to escape values
                    result += xmlescape(child.nodeValue);
                    break;
                case ElementType.CDATA:
                    // cdata section so don't escape values
                    result += '<![CDATA[' + child.nodeValue + ']]>';
            }
        }
        result += '</' + elem.nodeName + '>';
    } else {
        result += '/>';
    }
    return result;
}

/** Function: Strophe.forEachChild
 *  Map a function over some or all child elements of a given element.
 *
 *  This is a small convenience function for mapping a function over
 *  some or all of the children of an element.  If elemName is null, all
 *  children will be passed to the function, otherwise only children
 *  whose tag names match elemName will be passed.
 *
 *  Parameters:
 *    (XMLElement) elem - The element to operate on.
 *    (String) elemName - The child element tag name filter.
 *    (Function) func - The function to apply to each child.  This
 *      function should take a single argument, a DOM element.
 */
export function forEachChild (elem, elemName, func) {
    for (let i=0; i<elem.childNodes.length; i++) {
        const childNode = elem.childNodes[i];
        if (childNode.nodeType === ElementType.NORMAL &&
            (!elemName || this.isTagEqual(childNode, elemName))) {
            func(childNode);
        }
    }
}

/** Function: Strophe.isTagEqual
 *  Compare an element's tag name with a string.
 *
 *  This function is case sensitive.
 *
 *  Parameters:
 *    (XMLElement) el - A DOM element.
 *    (String) name - The element name.
 *
 *  Returns:
 *    true if the element's tag name matches _el_, and false
 *    otherwise.
 */
export function isTagEqual (el, name) {
    return el.tagName === name;
}

/** Function: Strophe.getText
 *  Get the concatenation of all text children of an element.
 *
 *  Parameters:
 *    (XMLElement) elem - A DOM element.
 *
 *  Returns:
 *    A String with the concatenated text of all text element children.
 */
export function getText (elem) {
    if (!elem) { return null; }

    let str = "";
    if (elem.childNodes.length === 0 && elem.nodeType === ElementType.TEXT) {
        str += elem.nodeValue;
    }
    for (let i=0; i<elem.childNodes.length; i++) {
        if (elem.childNodes[i].nodeType === ElementType.TEXT) {
            str += elem.childNodes[i].nodeValue;
        }
    }
    return xmlescape(str);
}

/** Function: Strophe.escapeNode
 *  Escape the node part (also called local part) of a JID.
 *
 *  Parameters:
 *    (String) node - A node (or local part).
 *
 *  Returns:
 *    An escaped node (or local part).
 */
export function escapeNode (node) {
    if (typeof node !== "string") { return node; }
    return node.replace(/^\s+|\s+$/g, '')
        .replace(/\\/g,  "\\5c")
        .replace(/ /g,   "\\20")
        .replace(/\"/g,  "\\22")
        .replace(/\&/g,  "\\26")
        .replace(/\'/g,  "\\27")
        .replace(/\//g,  "\\2f")
        .replace(/:/g,   "\\3a")
        .replace(/</g,   "\\3c")
        .replace(/>/g,   "\\3e")
        .replace(/@/g,   "\\40");
}

/** Function: Strophe.unescapeNode
 *  Unescape a node part (also called local part) of a JID.
 *
 *  Parameters:
 *    (String) node - A node (or local part).
 *
 *  Returns:
 *    An unescaped node (or local part).
 */
export function unescapeNode (node) {
    if (typeof node !== "string") { return node; }
    return node.replace(/\\20/g, " ")
        .replace(/\\22/g, '"')
        .replace(/\\26/g, "&")
        .replace(/\\27/g, "'")
        .replace(/\\2f/g, "/")
        .replace(/\\3a/g, ":")
        .replace(/\\3c/g, "<")
        .replace(/\\3e/g, ">")
        .replace(/\\40/g, "@")
        .replace(/\\5c/g, "\\");
}

/** Function: Strophe.getNodeFromJid
 *  Get the node portion of a JID String.
 *
 *  Parameters:
 *    (String) jid - A JID.
 *
 *  Returns:
 *    A String containing the node.
 */
export function getNodeFromJid (jid) {
    if (jid.indexOf("@") < 0) { return null; }
    return jid.split("@")[0];
}

/** Function: Strophe.getDomainFromJid
 *  Get the domain portion of a JID String.
 *
 *  Parameters:
 *    (String) jid - A JID.
 *
 *  Returns:
 *    A String containing the domain.
 */
export function getDomainFromJid (jid) {
    const bare = getBareJidFromJid(jid);
    if (bare.indexOf("@") < 0) {
        return bare;
    } else {
        const parts = bare.split("@");
        parts.splice(0, 1);
        return parts.join('@');
    }
}

/** Function: Strophe.getResourceFromJid
 *  Get the resource portion of a JID String.
 *
 *  Parameters:
 *    (String) jid - A JID.
 *
 *  Returns:
 *    A String containing the resource.
 */
export function getResourceFromJid (jid) {
    if (!jid) { return null; }
    const s = jid.split("/");
    if (s.length < 2) { return null; }
    s.splice(0, 1);
    return s.join('/');
}

/** Function: Strophe.getBareJidFromJid
 *  Get the bare JID from a JID String.
 *
 *  Parameters:
 *    (String) jid - A JID.
 *
 *  Returns:
 *    A String containing the bare JID.
 */
export function getBareJidFromJid (jid) {
    return jid ? jid.split("/")[0] : null;
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
