/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2018, OGG, LLC
*/
/*global define, document, sessionStorage, setTimeout, clearTimeout, ActiveXObject, DOMParser, btoa, atob */

import * as shims from './shims';
import MD5 from './md5';
import SASLAnonymous from './sasl-anon.js';
import SASLExternal from './sasl-external.js';
import SASLMechanism from './sasl.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import SHA1 from './sha1';
import utils from './utils';
import { atob, btoa } from 'abab'

/** Function: $build
 *  Create a Strophe.Builder.
 *  This is an alias for 'new Strophe.Builder(name, attrs)'.
 *
 *  Parameters:
 *    (String) name - The root element name.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
export function $build(name, attrs) {
    return new Strophe.Builder(name, attrs);
}

/** Function: $msg
 *  Create a Strophe.Builder with a <message/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <message/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
export function $msg(attrs) {
    return new Strophe.Builder("message", attrs);
}

/** Function: $iq
 *  Create a Strophe.Builder with an <iq/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <iq/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
export function $iq(attrs) {
    return new Strophe.Builder("iq", attrs);
}

/** Function: $pres
 *  Create a Strophe.Builder with a <presence/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <presence/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
export function $pres(attrs) {
    return new Strophe.Builder("presence", attrs);
}

/** Class: Strophe
 *  An object container for all Strophe library functions.
 *
 *  This class is just a container for all the objects and constants
 *  used in the library.  It is not meant to be instantiated, but to
 *  provide a namespace for library objects, constants, and functions.
 */
export const Strophe = {
    /** Constant: VERSION */
    VERSION: "1.5.0",

    /** Constants: XMPP Namespace Constants
     *  Common namespace constants from the XMPP RFCs and XEPs.
     *
     *  NS.HTTPBIND - HTTP BIND namespace from XEP 124.
     *  NS.BOSH - BOSH namespace from XEP 206.
     *  NS.CLIENT - Main XMPP client namespace.
     *  NS.AUTH - Legacy authentication namespace.
     *  NS.ROSTER - Roster operations namespace.
     *  NS.PROFILE - Profile namespace.
     *  NS.DISCO_INFO - Service discovery info namespace from XEP 30.
     *  NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
     *  NS.MUC - Multi-User Chat namespace from XEP 45.
     *  NS.SASL - XMPP SASL namespace from RFC 3920.
     *  NS.STREAM - XMPP Streams namespace from RFC 3920.
     *  NS.BIND - XMPP Binding namespace from RFC 3920 and RFC 6120.
     *  NS.SESSION - XMPP Session namespace from RFC 3920.
     *  NS.XHTML_IM - XHTML-IM namespace from XEP 71.
     *  NS.XHTML - XHTML body namespace from XEP 71.
     */
    NS: {
        HTTPBIND: "http://jabber.org/protocol/httpbind",
        BOSH: "urn:xmpp:xbosh",
        CLIENT: "jabber:client",
        AUTH: "jabber:iq:auth",
        ROSTER: "jabber:iq:roster",
        PROFILE: "jabber:iq:profile",
        DISCO_INFO: "http://jabber.org/protocol/disco#info",
        DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
        MUC: "http://jabber.org/protocol/muc",
        SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
        STREAM: "http://etherx.jabber.org/streams",
        FRAMING: "urn:ietf:params:xml:ns:xmpp-framing",
        BIND: "urn:ietf:params:xml:ns:xmpp-bind",
        SESSION: "urn:ietf:params:xml:ns:xmpp-session",
        VERSION: "jabber:iq:version",
        STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas",
        XHTML_IM: "http://jabber.org/protocol/xhtml-im",
        XHTML: "http://www.w3.org/1999/xhtml"
    },

    /** Constants: XHTML_IM Namespace
     *  contains allowed tags, tag attributes, and css properties.
     *  Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
     *  See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
     *  allowed tags and their attributes.
     */
    XHTML: {
        tags: ['a','blockquote','br','cite','em','img','li','ol','p','span','strong','ul','body'],
        attributes: {
            'a':          ['href'],
            'blockquote': ['style'],
            'br':         [],
            'cite':       ['style'],
            'em':         [],
            'img':        ['src', 'alt', 'style', 'height', 'width'],
            'li':         ['style'],
            'ol':         ['style'],
            'p':          ['style'],
            'span':       ['style'],
            'strong':     [],
            'ul':         ['style'],
            'body':       []
        },
        css: ['background-color','color','font-family','font-size','font-style','font-weight','margin-left','margin-right','text-align','text-decoration'],
        /** Function: XHTML.validTag
         *
         * Utility method to determine whether a tag is allowed
         * in the XHTML_IM namespace.
         *
         * XHTML tag names are case sensitive and must be lower case.
         */
        validTag (tag) {
            for (let i=0; i<Strophe.XHTML.tags.length; i++) {
                if (tag === Strophe.XHTML.tags[i]) {
                    return true;
                }
            }
            return false;
        },
        /** Function: XHTML.validAttribute
         *
         * Utility method to determine whether an attribute is allowed
         * as recommended per XEP-0071
         *
         * XHTML attribute names are case sensitive and must be lower case.
         */
        validAttribute (tag, attribute) {
            if (typeof Strophe.XHTML.attributes[tag] !== 'undefined' && Strophe.XHTML.attributes[tag].length > 0) {
                for (let i=0; i<Strophe.XHTML.attributes[tag].length; i++) {
                    if (attribute === Strophe.XHTML.attributes[tag][i]) {
                        return true;
                    }
                }
            }
        return false;
        },
        validCSS (style) {
            for (let i=0; i<Strophe.XHTML.css.length; i++) {
                if (style === Strophe.XHTML.css[i]) {
                    return true;
                }
            }
            return false;
        }
    },

    /** Constants: Connection Status Constants
     *  Connection status constants for use by the connection handler
     *  callback.
     *
     *  Status.ERROR - An error has occurred
     *  Status.CONNECTING - The connection is currently being made
     *  Status.CONNFAIL - The connection attempt failed
     *  Status.AUTHENTICATING - The connection is authenticating
     *  Status.AUTHFAIL - The authentication attempt failed
     *  Status.CONNECTED - The connection has succeeded
     *  Status.DISCONNECTED - The connection has been terminated
     *  Status.DISCONNECTING - The connection is currently being terminated
     *  Status.ATTACHED - The connection has been attached
     *  Status.REDIRECT - The connection has been redirected
     *  Status.CONNTIMEOUT - The connection has timed out
     */
    Status: {
        ERROR: 0,
        CONNECTING: 1,
        CONNFAIL: 2,
        AUTHENTICATING: 3,
        AUTHFAIL: 4,
        CONNECTED: 5,
        DISCONNECTED: 6,
        DISCONNECTING: 7,
        ATTACHED: 8,
        REDIRECT: 9,
        CONNTIMEOUT: 10,
        BINDREQUIRED: 11,
        ATTACHFAIL: 12
    },

    ErrorCondition: {
        BAD_FORMAT: "bad-format",
        CONFLICT: "conflict",
        MISSING_JID_NODE: "x-strophe-bad-non-anon-jid",
        NO_AUTH_MECH: "no-auth-mech",
        UNKNOWN_REASON: "unknown",
    },

    /** Constants: Log Level Constants
     *  Logging level indicators.
     *
     *  LogLevel.DEBUG - Debug output
     *  LogLevel.INFO - Informational output
     *  LogLevel.WARN - Warnings
     *  LogLevel.ERROR - Errors
     *  LogLevel.FATAL - Fatal errors
     */
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },

    /** PrivateConstants: DOM Element Type Constants
     *  DOM element types.
     *
     *  ElementType.NORMAL - Normal element.
     *  ElementType.TEXT - Text data element.
     *  ElementType.FRAGMENT - XHTML fragment element.
     */
    ElementType: {
        NORMAL: 1,
        TEXT: 3,
        CDATA: 4,
        FRAGMENT: 11
    },

    /** PrivateConstants: Timeout Values
     *  Timeout values for error states.  These values are in seconds.
     *  These should not be changed unless you know exactly what you are
     *  doing.
     *
     *  TIMEOUT - Timeout multiplier. A waiting request will be considered
     *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 1.1, and with default wait, 66 seconds.
     *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
     *      Strophe can detect early failure, it will consider the request
     *      failed if it doesn't return after
     *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 0.1, and with default wait, 6 seconds.
     */
    TIMEOUT: 1.1,
    SECONDARY_TIMEOUT: 0.1,

    /** Function: addNamespace
     *  This function is used to extend the current namespaces in
     *  Strophe.NS.  It takes a key and a value with the key being the
     *  name of the new namespace, with its actual value.
     *  For example:
     *  Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     *  Parameters:
     *    (String) name - The name under which the namespace will be
     *      referenced under Strophe.NS
     *    (String) value - The actual namespace.
     */
    addNamespace (name, value) {
        Strophe.NS[name] = value;
    },

    /** Function: forEachChild
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
    forEachChild (elem, elemName, func) {
        for (let i=0; i<elem.childNodes.length; i++) {
            const childNode = elem.childNodes[i];
            if (childNode.nodeType === Strophe.ElementType.NORMAL &&
                (!elemName || this.isTagEqual(childNode, elemName))) {
                func(childNode);
            }
        }
    },

    /** Function: isTagEqual
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
    isTagEqual (el, name) {
        return el.tagName === name;
    },

    /** PrivateVariable: _xmlGenerator
     *  _Private_ variable that caches a DOM document to
     *  generate elements.
     */
    _xmlGenerator: null,

    /** Function: xmlGenerator
     *  Get the DOM document to generate elements.
     *
     *  Returns:
     *    The currently used DOM document.
     */
    xmlGenerator () {
        if (!Strophe._xmlGenerator) {
            Strophe._xmlGenerator = shims.getDummyXMLDOMDocument()
        }
        return Strophe._xmlGenerator;
    },

    /** Function: xmlElement
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
    xmlElement (name) {
        if (!name) { return null; }

        const node = Strophe.xmlGenerator().createElement(name);
        // FIXME: this should throw errors if args are the wrong type or
        // there are more than two optional args
        for (let a=1; a<arguments.length; a++) {
            const arg = arguments[a];
            if (!arg) { continue; }
            if (typeof(arg) === "string" ||
                typeof(arg) === "number") {
                node.appendChild(Strophe.xmlTextNode(arg));
            } else if (typeof(arg) === "object" &&
                       typeof(arg.sort) === "function") {
                for (let i=0; i<arg.length; i++) {
                    const attr = arg[i];
                    if (typeof(attr) === "object" &&
                        typeof(attr.sort) === "function" &&
                        attr[1] !== undefined &&
                        attr[1] !== null) {
                        node.setAttribute(attr[0], attr[1]);
                    }
                }
            } else if (typeof(arg) === "object") {
                for (const k in arg) {
                    if (Object.prototype.hasOwnProperty.call(arg, k) && arg[k] !== undefined && arg[k] !== null) {
                        node.setAttribute(k, arg[k]);
                    }
                }
            }
        }
        return node;
    },

    /*  Function: xmlescape
     *  Excapes invalid xml characters.
     *
     *  Parameters:
     *     (String) text - text to escape.
     *
     *  Returns:
     *      Escaped text.
     */
    xmlescape (text) {
        text = text.replace(/\&/g, "&amp;");
        text = text.replace(/</g,  "&lt;");
        text = text.replace(/>/g,  "&gt;");
        text = text.replace(/'/g,  "&apos;");
        text = text.replace(/"/g,  "&quot;");
        return text;
    },

    /*  Function: xmlunescape
    *  Unexcapes invalid xml characters.
    *
    *  Parameters:
    *     (String) text - text to unescape.
    *
    *  Returns:
    *      Unescaped text.
    */
    xmlunescape (text) {
        text = text.replace(/\&amp;/g, "&");
        text = text.replace(/&lt;/g,  "<");
        text = text.replace(/&gt;/g,  ">");
        text = text.replace(/&apos;/g,  "'");
        text = text.replace(/&quot;/g,  "\"");
        return text;
    },

    /** Function: xmlTextNode
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
    xmlTextNode (text) {
        return Strophe.xmlGenerator().createTextNode(text);
    },

    /** Function: xmlHtmlNode
     *  Creates an XML DOM html node.
     *
     *  Parameters:
     *    (String) html - The content of the html node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlHtmlNode (html) {
        let node;
        //ensure text is escaped
        if (shims.DOMParser) {
            const parser = new shims.DOMParser();
            node = parser.parseFromString(html, "text/xml");
        } else {
            node = new ActiveXObject("Microsoft.XMLDOM");
            node.async="false";
            node.loadXML(html);
        }
        return node;
    },

    /** Function: getText
     *  Get the concatenation of all text children of an element.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A String with the concatenated text of all text element children.
     */
    getText (elem) {
        if (!elem) { return null; }

        let str = "";
        if (elem.childNodes.length === 0 && elem.nodeType === Strophe.ElementType.TEXT) {
            str += elem.nodeValue;
        }
        for (let i=0; i<elem.childNodes.length; i++) {
            if (elem.childNodes[i].nodeType === Strophe.ElementType.TEXT) {
                str += elem.childNodes[i].nodeValue;
            }
        }
        return Strophe.xmlescape(str);
    },

    /** Function: copyElement
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
    copyElement (elem) {
        let el;
        if (elem.nodeType === Strophe.ElementType.NORMAL) {
            el = Strophe.xmlElement(elem.tagName);

            for (let i=0; i<elem.attributes.length; i++) {
                el.setAttribute(elem.attributes[i].nodeName,
                                elem.attributes[i].value);
            }

            for (let i=0; i<elem.childNodes.length; i++) {
                el.appendChild(Strophe.copyElement(elem.childNodes[i]));
            }
        } else if (elem.nodeType === Strophe.ElementType.TEXT) {
            el = Strophe.xmlGenerator().createTextNode(elem.nodeValue);
        }
        return el;
    },


    /** Function: createHtml
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
    createHtml (elem) {
        let el;
        if (elem.nodeType === Strophe.ElementType.NORMAL) {
            const tag = elem.nodeName.toLowerCase(); // XHTML tags must be lower case.
            if (Strophe.XHTML.validTag(tag)) {
                try {
                    el = Strophe.xmlElement(tag);
                    for (let i=0; i < Strophe.XHTML.attributes[tag].length; i++) {
                        const attribute = Strophe.XHTML.attributes[tag][i];
                        let value = elem.getAttribute(attribute);
                        if (typeof value === 'undefined' || value === null || value === '' || value === false || value === 0) {
                            continue;
                        }
                        if (attribute === 'style' && typeof value === 'object' && typeof value.cssText !== 'undefined') {
                            value = value.cssText; // we're dealing with IE, need to get CSS out
                        }
                        // filter out invalid css styles
                        if (attribute === 'style') {
                            const css = [];
                            const cssAttrs = value.split(';');
                            for (let j=0; j < cssAttrs.length; j++) {
                                const attr = cssAttrs[j].split(':');
                                const cssName = attr[0].replace(/^\s*/, "").replace(/\s*$/, "").toLowerCase();
                                if(Strophe.XHTML.validCSS(cssName)) {
                                    const cssValue = attr[1].replace(/^\s*/, "").replace(/\s*$/, "");
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
                    for (let i=0; i < elem.childNodes.length; i++) {
                        el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                    }
                } catch(e) { // invalid elements
                    el = Strophe.xmlTextNode('');
                }
            } else {
                el = Strophe.xmlGenerator().createDocumentFragment();
                for (let i=0; i < elem.childNodes.length; i++) {
                    el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                }
            }
        } else if (elem.nodeType === Strophe.ElementType.FRAGMENT) {
            el = Strophe.xmlGenerator().createDocumentFragment();
            for (let i=0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.createHtml(elem.childNodes[i]));
            }
        } else if (elem.nodeType === Strophe.ElementType.TEXT) {
            el = Strophe.xmlTextNode(elem.nodeValue);
        }
        return el;
    },

    /** Function: escapeNode
     *  Escape the node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An escaped node (or local part).
     */
    escapeNode (node) {
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
    },

    /** Function: unescapeNode
     *  Unescape a node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An unescaped node (or local part).
     */
    unescapeNode (node) {
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
    },

    /** Function: getNodeFromJid
     *  Get the node portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the node.
     */
    getNodeFromJid (jid) {
        if (jid.indexOf("@") < 0) { return null; }
        return jid.split("@")[0];
    },

    /** Function: getDomainFromJid
     *  Get the domain portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the domain.
     */
    getDomainFromJid (jid) {
        const bare = Strophe.getBareJidFromJid(jid);
        if (bare.indexOf("@") < 0) {
            return bare;
        } else {
            const parts = bare.split("@");
            parts.splice(0, 1);
            return parts.join('@');
        }
    },

    /** Function: getResourceFromJid
     *  Get the resource portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the resource.
     */
    getResourceFromJid (jid) {
        if (!jid) { return null; }
        const s = jid.split("/");
        if (s.length < 2) { return null; }
        s.splice(0, 1);
        return s.join('/');
    },

    /** Function: getBareJidFromJid
     *  Get the bare JID from a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the bare JID.
     */
    getBareJidFromJid (jid) {
        return jid ? jid.split("/")[0] : null;
    },

    /** PrivateFunction: _handleError
     *  _Private_ function that properly logs an error to the console
     */
    _handleError (e) {
        if (typeof e.stack !== "undefined") {
            Strophe.fatal(e.stack);
        }
        if (e.sourceURL) {
            Strophe.fatal("error: " + this.handler + " " + e.sourceURL + ":" +
                          e.line + " - " + e.name + ": " + e.message);
        } else if (e.fileName) {
            Strophe.fatal("error: " + this.handler + " " +
                          e.fileName + ":" + e.lineNumber + " - " +
                          e.name + ": " + e.message);
        } else {
            Strophe.fatal("error: " + e.message);
        }
    },

    /** Function: log
     *  User overrideable logging function.
     *
     *  This function is called whenever the Strophe library calls any
     *  of the logging functions.  The default implementation of this
     *  function logs only fatal errors.  If client code wishes to handle the logging
     *  messages, it should override this with
     *  > Strophe.log = function (level, msg) {
     *  >   (user code here)
     *  > };
     *
     *  Please note that data sent and received over the wire is logged
     *  via Strophe.Connection.rawInput() and Strophe.Connection.rawOutput().
     *
     *  The different levels and their meanings are
     *
     *    DEBUG - Messages useful for debugging purposes.
     *    INFO - Informational messages.  This is mostly information like
     *      'disconnect was called' or 'SASL auth succeeded'.
     *    WARN - Warnings about potential problems.  This is mostly used
     *      to report transient connection errors like request timeouts.
     *    ERROR - Some error occurred.
     *    FATAL - A non-recoverable fatal error occurred.
     *
     *  Parameters:
     *    (Integer) level - The log level of the log message.  This will
     *      be one of the values in Strophe.LogLevel.
     *    (String) msg - The log message.
     */
    log (level, msg) {
        if (level === this.LogLevel.FATAL) {
            console?.error(msg);
        }
    },

    /** Function: debug
     *  Log a message at the Strophe.LogLevel.DEBUG level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    debug (msg) {
        this.log(this.LogLevel.DEBUG, msg);
    },

    /** Function: info
     *  Log a message at the Strophe.LogLevel.INFO level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    info (msg) {
        this.log(this.LogLevel.INFO, msg);
    },

    /** Function: warn
     *  Log a message at the Strophe.LogLevel.WARN level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    warn (msg) {
        this.log(this.LogLevel.WARN, msg);
    },

    /** Function: error
     *  Log a message at the Strophe.LogLevel.ERROR level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    error (msg) {
        this.log(this.LogLevel.ERROR, msg);
    },

    /** Function: fatal
     *  Log a message at the Strophe.LogLevel.FATAL level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    fatal (msg) {
        this.log(this.LogLevel.FATAL, msg);
    },

    /** Function: serialize
     *  Render a DOM element and all descendants to a String.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The serialized element tree as a String.
     */
    serialize (elem) {
        if (!elem) { return null; }
        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
        const names = [...Array(elem.attributes.length).keys()].map(i => elem.attributes[i].nodeName);
        names.sort();
        let result = names.reduce(
            (a, n) => `${a} ${n}="${Strophe.xmlescape(elem.attributes.getNamedItem(n).value)}"`,
            `<${elem.nodeName}`
        );

        if (elem.childNodes.length > 0) {
            result += ">";
            for (let i=0; i < elem.childNodes.length; i++) {
                const child = elem.childNodes[i];
                switch (child.nodeType) {
                    case Strophe.ElementType.NORMAL:
                        // normal element, so recurse
                        result += Strophe.serialize(child);
                        break;
                    case Strophe.ElementType.TEXT:
                        // text element to escape values
                        result += Strophe.xmlescape(child.nodeValue);
                        break;
                    case Strophe.ElementType.CDATA:
                        // cdata section so don't escape values
                        result += "<![CDATA["+child.nodeValue+"]]>";
                }
            }
            result += "</" + elem.nodeName + ">";
        } else {
            result += "/>";
        }
        return result;
    },

    /** PrivateVariable: _requestId
     *  _Private_ variable that keeps track of the request ids for
     *  connections.
     */
    _requestId: 0,

    /** PrivateVariable: Strophe.connectionPlugins
     *  _Private_ variable Used to store plugin names that need
     *  initialization on Strophe.Connection construction.
     */
    _connectionPlugins: {},

    /** Function: addConnectionPlugin
     *  Extends the Strophe.Connection object with the given plugin.
     *
     *  Parameters:
     *    (String) name - The name of the extension.
     *    (Object) ptype - The plugin's prototype.
     */
    addConnectionPlugin (name, ptype) {
        Strophe._connectionPlugins[name] = ptype;
    }
};

/** Class: Strophe.Builder
 *  XML DOM builder.
 *
 *  This object provides an interface similar to JQuery but for building
 *  DOM elements easily and rapidly.  All the functions except for toString()
 *  and tree() return the object, so calls can be chained.  Here's an
 *  example using the $iq() builder helper.
 *  > $iq({to: 'you', from: 'me', type: 'get', id: '1'})
 *  >     .c('query', {xmlns: 'strophe:example'})
 *  >     .c('example')
 *  >     .toString()
 *
 *  The above generates this XML fragment
 *  > <iq to='you' from='me' type='get' id='1'>
 *  >   <query xmlns='strophe:example'>
 *  >     <example/>
 *  >   </query>
 *  > </iq>
 *  The corresponding DOM manipulations to get a similar fragment would be
 *  a lot more tedious and probably involve several helper variables.
 *
 *  Since adding children makes new operations operate on the child, up()
 *  is provided to traverse up the tree.  To add two children, do
 *  > builder.c('child1', ...).up().c('child2', ...)
 *  The next operation on the Builder will be relative to the second child.
 */

/** Constructor: Strophe.Builder
 *  Create a Strophe.Builder object.
 *
 *  The attributes should be passed in object notation.  For example
 *  > let b = new Builder('message', {to: 'you', from: 'me'});
 *  or
 *  > let b = new Builder('messsage', {'xml:lang': 'en'});
 *
 *  Parameters:
 *    (String) name - The name of the root element.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder.
 */

Strophe.Builder = class Builder {

    constructor (name, attrs) {
        // Set correct namespace for jabber:client elements
        if (name === "presence" || name === "message" || name === "iq") {
            if (attrs && !attrs.xmlns) {
                attrs.xmlns = Strophe.NS.CLIENT;
            } else if (!attrs) {
                attrs = {xmlns: Strophe.NS.CLIENT};
            }
        }
        // Holds the tree being built.
        this.nodeTree = Strophe.xmlElement(name, attrs);
        // Points to the current operation node.
        this.node = this.nodeTree;
    }

    /** Function: tree
     *  Return the DOM tree.
     *
     *  This function returns the current DOM tree as an element object.  This
     *  is suitable for passing to functions like Strophe.Connection.send().
     *
     *  Returns:
     *    The DOM tree as a element object.
     */
    tree () {
        return this.nodeTree;
    }

    /** Function: toString
     *  Serialize the DOM tree to a String.
     *
     *  This function returns a string serialization of the current DOM
     *  tree.  It is often used internally to pass data to a
     *  Strophe.Request object.
     *
     *  Returns:
     *    The serialized DOM tree in a String.
     */
    toString () {
        return Strophe.serialize(this.nodeTree);
    }

    /** Function: up
     *  Make the current parent element the new current element.
     *
     *  This function is often used after c() to traverse back up the tree.
     *  For example, to add two children to the same element
     *  > builder.c('child1', {}).up().c('child2', {});
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    up () {
        this.node = this.node.parentNode;
        return this;
    }

    /** Function: root
     *  Make the root element the new current element.
     *
     *  When at a deeply nested element in the tree, this function can be used
     *  to jump back to the root of the tree, instead of having to repeatedly
     *  call up().
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    root () {
        this.node = this.nodeTree;
        return this;
    }

    /** Function: attrs
     *  Add or modify attributes of the current element.
     *
     *  The attributes should be passed in object notation.  This function
     *  does not move the current element pointer.
     *
     *  Parameters:
     *    (Object) moreattrs - The attributes to add/modify in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    attrs (moreattrs) {
        for (const k in moreattrs) {
            if (Object.prototype.hasOwnProperty.call(moreattrs, k)) {
                if (moreattrs[k] === undefined) {
                    this.node.removeAttribute(k);
                } else {
                    this.node.setAttribute(k, moreattrs[k]);
                }
            }
        }
        return this;
    }

    /** Function: c
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function moves the current element pointer to the child,
     *  unless text is provided.  If you need to add another child, it
     *  is necessary to use up() to go back to the parent in the tree.
     *
     *  Parameters:
     *    (String) name - The name of the child.
     *    (Object) attrs - The attributes of the child in object notation.
     *    (String) text - The text to add to the child.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    c (name, attrs, text) {
        const child = Strophe.xmlElement(name, attrs, text);
        this.node.appendChild(child);
        if (typeof text !== "string" && typeof text !=="number") {
            this.node = child;
        }
        return this;
    }

    /** Function: cnode
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function is the same as c() except that instead of using a
     *  name and an attributes object to create the child it uses an
     *  existing DOM element object.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    cnode (elem) {
        let impNode;
        const xmlGen = Strophe.xmlGenerator();
        try {
            impNode = (xmlGen.importNode !== undefined);
        } catch (e) {
            impNode = false;
        }
        const newElem = impNode ? xmlGen.importNode(elem, true) : Strophe.copyElement(elem);
        this.node.appendChild(newElem);
        this.node = newElem;
        return this;
    }

    /** Function: t
     *  Add a child text element.
     *
     *  This *does not* make the child the new current element since there
     *  are no children of text elements.
     *
     *  Parameters:
     *    (String) text - The text data to append to the current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    t (text) {
        const child = Strophe.xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    }

    /** Function: h
     *  Replace current element contents with the HTML passed in.
     *
     *  This *does not* make the child the new current element
     *
     *  Parameters:
     *    (String) html - The html to insert as contents of current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    h (html) {
        const fragment = Strophe.xmlGenerator().createElement('body');
        // force the browser to try and fix any invalid HTML tags
        fragment.innerHTML = html;
        // copy cleaned html into an xml dom
        const xhtml = Strophe.createHtml(fragment);
        while (xhtml.childNodes.length > 0) {
            this.node.appendChild(xhtml.childNodes[0]);
        }
        return this;
    }
};

/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistant depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */

/** PrivateConstructor: Strophe.Handler
 *  Create and initialize a new Strophe.Handler.
 *
 *  Parameters:
 *    (Function) handler - A function to be executed when the handler is run.
 *    (String) ns - The namespace to match.
 *    (String) name - The element name to match.
 *    (String) type - The element type to match.
 *    (String) id - The element id attribute to match.
 *    (String) from - The element from attribute to match.
 *    (Object) options - Handler options
 *
 *  Returns:
 *    A new Strophe.Handler object.
 */
Strophe.Handler = function (handler, ns, name, type, id, from, options) {
    this.handler = handler;
    this.ns = ns;
    this.name = name;
    this.type = type;
    this.id = id;
    this.options = options || {'matchBareFromJid': false, 'ignoreNamespaceFragment': false};
    // BBB: Maintain backward compatibility with old `matchBare` option
    if (this.options.matchBare) {
        Strophe.warn('The "matchBare" option is deprecated, use "matchBareFromJid" instead.');
        this.options.matchBareFromJid = this.options.matchBare;
        delete this.options.matchBare;
    }
    if (this.options.matchBareFromJid) {
        this.from = from ? Strophe.getBareJidFromJid(from) : null;
    } else {
        this.from = from;
    }
    // whether the handler is a user handler or a system handler
    this.user = true;
};

Strophe.Handler.prototype = {
    /** PrivateFunction: getNamespace
     *  Returns the XML namespace attribute on an element.
     *  If `ignoreNamespaceFragment` was passed in for this handler, then the
     *  URL fragment will be stripped.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element with the namespace.
     *
     *  Returns:
     *    The namespace, with optionally the fragment stripped.
     */
    getNamespace (elem) {
        let elNamespace = elem.getAttribute("xmlns");
        if (elNamespace && this.options.ignoreNamespaceFragment) {
            elNamespace = elNamespace.split('#')[0];
        }
        return elNamespace;
    },

    /** PrivateFunction: namespaceMatch
     *  Tests if a stanza matches the namespace set for this Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
     */
    namespaceMatch (elem) {
        let nsMatch = false;
        if (!this.ns) {
            return true;
        } else {
            Strophe.forEachChild(elem, null, (elem) => {
                if (this.getNamespace(elem) === this.ns) {
                    nsMatch = true;
                }
            });
            return nsMatch || this.getNamespace(elem) === this.ns;
        }
    },

    /** PrivateFunction: isMatch
     *  Tests if a stanza matches the Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
     */
    isMatch (elem) {
        let from = elem.getAttribute('from');
        if (this.options.matchBareFromJid) {
            from = Strophe.getBareJidFromJid(from);
        }
        const elem_type = elem.getAttribute("type");
        if (this.namespaceMatch(elem) &&
            (!this.name || Strophe.isTagEqual(elem, this.name)) &&
            (!this.type || (Array.isArray(this.type) ? this.type.indexOf(elem_type) !== -1 : elem_type === this.type)) &&
            (!this.id || elem.getAttribute("id") === this.id) &&
            (!this.from || from === this.from)) {
                return true;
        }
        return false;
    },

    /** PrivateFunction: run
     *  Run the callback on a matching stanza.
     *
     *  Parameters:
     *    (XMLElement) elem - The DOM element that triggered the
     *      Strophe.Handler.
     *
     *  Returns:
     *    A boolean indicating if the handler should remain active.
     */
    run (elem) {
        let result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            Strophe._handleError(e);
            throw e;
        }
        return result;
    },

    /** PrivateFunction: toString
     *  Get a String representation of the Strophe.Handler object.
     *
     *  Returns:
     *    A String.
     */
    toString () {
        return "{Handler: " + this.handler + "(" + this.name + "," +
            this.id + "," + this.ns + ")}";
    }
};

/** PrivateClass: Strophe.TimedHandler
 *  _Private_ helper class for managing timed handlers.
 *
 *  A Strophe.TimedHandler encapsulates a user provided callback that
 *  should be called after a certain period of time or at regular
 *  intervals.  The return value of the callback determines whether the
 *  Strophe.TimedHandler will continue to fire.
 *
 *  Users will not use Strophe.TimedHandler objects directly, but instead
 *  they will use Strophe.Connection.addTimedHandler() and
 *  Strophe.Connection.deleteTimedHandler().
 */
Strophe.TimedHandler = class TimedHandler {

    /** PrivateConstructor: Strophe.TimedHandler
     *  Create and initialize a new Strophe.TimedHandler object.
     *
     *  Parameters:
     *    (Integer) period - The number of milliseconds to wait before the
     *      handler is called.
     *    (Function) handler - The callback to run when the handler fires.  This
     *      function should take no arguments.
     *
     *  Returns:
     *    A new Strophe.TimedHandler object.
     */
    constructor (period, handler) {
        this.period = period;
        this.handler = handler;
        this.lastCalled = new Date().getTime();
        this.user = true;
    }

    /** PrivateFunction: run
     *  Run the callback for the Strophe.TimedHandler.
     *
     *  Returns:
     *    true if the Strophe.TimedHandler should be called again, and false
     *      otherwise.
     */
    run () {
        this.lastCalled = new Date().getTime();
        return this.handler();
    }

    /** PrivateFunction: reset
     *  Reset the last called time for the Strophe.TimedHandler.
     */
    reset () {
        this.lastCalled = new Date().getTime();
    }

    /** PrivateFunction: toString
     *  Get a string representation of the Strophe.TimedHandler object.
     *
     *  Returns:
     *    The string representation.
     */
    toString () {
        return "{TimedHandler: " + this.handler + "(" + this.period +")}";
    }
};

/** Class: Strophe.Connection
 *  XMPP Connection manager.
 *
 *  This class is the main part of Strophe.  It manages a BOSH or websocket
 *  connection to an XMPP server and dispatches events to the user callbacks
 *  as data arrives. It supports SASL PLAIN, SASL SCRAM-SHA-1
 *  and legacy authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection. These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */

/** Constructor: Strophe.Connection
 *  Create and initialize a Strophe.Connection object.
 *
 *  The transport-protocol for this connection will be chosen automatically
 *  based on the given service parameter. URLs starting with "ws://" or
 *  "wss://" will use WebSockets, URLs starting with "http://", "https://"
 *  or without a protocol will use BOSH.
 *
 *  To make Strophe connect to the current host you can leave out the protocol
 *  and host part and just pass the path, e.g.
 *
 *  > let conn = new Strophe.Connection("/http-bind/");
 *
 *  Options common to both Websocket and BOSH:
 *  ------------------------------------------
 *
 *  cookies:
 *
 *  The *cookies* option allows you to pass in cookies to be added to the
 *  document. These cookies will then be included in the BOSH XMLHttpRequest
 *  or in the websocket connection.
 *
 *  The passed in value must be a map of cookie names and string values.
 *
 *  > { "myCookie": {
 *  >     "value": "1234",
 *  >     "domain": ".example.org",
 *  >     "path": "/",
 *  >     "expires": expirationDate
 *  >     }
 *  > }
 *
 *  Note that cookies can't be set in this way for other domains (i.e. cross-domain).
 *  Those cookies need to be set under those domains, for example they can be
 *  set server-side by making a XHR call to that domain to ask it to set any
 *  necessary cookies.
 *
 *  mechanisms:
 *
 *  The *mechanisms* option allows you to specify the SASL mechanisms that this
 *  instance of Strophe.Connection (and therefore your XMPP client) will
 *  support.
 *
 *  The value must be an array of objects with Strophe.SASLMechanism
 *  prototypes.
 *
 *  If nothing is specified, then the following mechanisms (and their
 *  priorities) are registered:
 *
 *      SCRAM-SHA-1 - 60
 *      PLAIN       - 50
 *      OAUTHBEARER - 40
 *      X-OAUTH2    - 30
 *      ANONYMOUS   - 20
 *      EXTERNAL    - 10
 *
 *  explicitResourceBinding:
 *
 *  If `explicitResourceBinding` is set to a truthy value, then the XMPP client
 *  needs to explicitly call `Strophe.Connection.prototype.bind` once the XMPP
 *  server has advertised the "urn:ietf:params:xml:ns:xmpp-bind" feature.
 *
 *  Making this step explicit allows client authors to first finish other
 *  stream related tasks, such as setting up an XEP-0198 Stream Management
 *  session, before binding the JID resource for this session.
 *
 *  WebSocket options:
 *  ------------------
 *
 *  protocol:
 *
 *  If you want to connect to the current host with a WebSocket connection you
 *  can tell Strophe to use WebSockets through a "protocol" attribute in the
 *  optional options parameter. Valid values are "ws" for WebSocket and "wss"
 *  for Secure WebSocket.
 *  So to connect to "wss://CURRENT_HOSTNAME/xmpp-websocket" you would call
 *
 *  > let conn = new Strophe.Connection("/xmpp-websocket/", {protocol: "wss"});
 *
 *  Note that relative URLs _NOT_ starting with a "/" will also include the path
 *  of the current site.
 *
 *  Also because downgrading security is not permitted by browsers, when using
 *  relative URLs both BOSH and WebSocket connections will use their secure
 *  variants if the current connection to the site is also secure (https).
 *
 *  worker:
 *
 *  Set this option to URL from where the shared worker script should be loaded.
 *
 *  To run the websocket connection inside a shared worker.
 *  This allows you to share a single websocket-based connection between
 *  multiple Strophe.Connection instances, for example one per browser tab.
 *
 *  The script to use is the one in `src/shared-connection-worker.js`.
 *
 *  BOSH options:
 *  -------------
 *
 *  By adding "sync" to the options, you can control if requests will
 *  be made synchronously or not. The default behaviour is asynchronous.
 *  If you want to make requests synchronous, make "sync" evaluate to true.
 *  > let conn = new Strophe.Connection("/http-bind/", {sync: true});
 *
 *  You can also toggle this on an already established connection.
 *  > conn.options.sync = true;
 *
 *  The *customHeaders* option can be used to provide custom HTTP headers to be
 *  included in the XMLHttpRequests made.
 *
 *  The *keepalive* option can be used to instruct Strophe to maintain the
 *  current BOSH session across interruptions such as webpage reloads.
 *
 *  It will do this by caching the sessions tokens in sessionStorage, and when
 *  "restore" is called it will check whether there are cached tokens with
 *  which it can resume an existing session.
 *
 *  The *withCredentials* option should receive a Boolean value and is used to
 *  indicate wether cookies should be included in ajax requests (by default
 *  they're not).
 *  Set this value to true if you are connecting to a BOSH service
 *  and for some reason need to send cookies to it.
 *  In order for this to work cross-domain, the server must also enable
 *  credentials by setting the Access-Control-Allow-Credentials response header
 *  to "true". For most usecases however this setting should be false (which
 *  is the default).
 *  Additionally, when using Access-Control-Allow-Credentials, the
 *  Access-Control-Allow-Origin header can't be set to the wildcard "*", but
 *  instead must be restricted to actual domains.
 *
 *  The *contentType* option can be set to change the default Content-Type
 *  of "text/xml; charset=utf-8", which can be useful to reduce the amount of
 *  CORS preflight requests that are sent to the server.
 *
 *  Parameters:
 *    (String) service - The BOSH or WebSocket service URL.
 *    (Object) options - A hash of configuration options
 *
 *  Returns:
 *    A new Strophe.Connection object.
 */

Strophe.Connection = class Connection {

    constructor (service, options) {
        // The service URL
        this.service = service;
        // Configuration options
        this.options = options || {};

        this.setProtocol();

        /* The connected JID. */
        this.jid = "";
        /* the JIDs domain */
        this.domain = null;
        /* stream:features */
        this.features = null;

        // SASL
        this._sasl_data = {};
        this.do_bind = false;
        this.do_session = false;
        this.mechanisms = {}

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
        this.protocolErrorHandlers = {
            'HTTP': {},
            'websocket': {}
        };

        this._idleTimeout = null;
        this._disconnectTimeout = null;

        this.authenticated = false;
        this.connected = false;
        this.disconnecting = false;
        this.do_authentication = true;
        this.paused = false;
        this.restored = false;

        this._data = [];
        this._uniqueId = 0;

        this._sasl_success_handler = null;
        this._sasl_failure_handler = null;
        this._sasl_challenge_handler = null;

        // Max retries before disconnecting
        this.maxRetries = 5;

        // Call onIdle callback every 1/10th of a second
        this._idleTimeout = setTimeout(() => this._onIdle(), 100);

        utils.addCookies(this.options.cookies);
        this.registerSASLMechanisms(this.options.mechanisms);

        // A client must always respond to incoming IQ "set" and "get" stanzas.
        // See https://datatracker.ietf.org/doc/html/rfc6120#section-8.2.3
        //
        // This is a fallback handler which gets called when no other handler
        // was called for a received IQ "set" or "get".
        this.iqFallbackHandler = new Strophe.Handler(
            (iq) => this.send($iq({type: 'error', id: iq.getAttribute('id')})
                    .c('error', {'type': 'cancel'})
                    .c('service-unavailable', {'xmlns': Strophe.NS.STANZAS})),
            null, 'iq', ['get', 'set']);

        // initialize plugins
        for (const k in Strophe._connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(Strophe._connectionPlugins, k)) {
                const F = function () {};
                F.prototype = Strophe._connectionPlugins[k];
                this[k] = new F();
                this[k].init(this);
            }
        }
    }

    /** Function: setProtocol
     *  Select protocal based on this.options or this.service
     */
    setProtocol () {
        const proto = this.options.protocol || "";
        if (this.options.worker) {
            this._proto = new Strophe.WorkerWebsocket(this);
        } else if (
                this.service.indexOf("ws:") === 0 ||
                this.service.indexOf("wss:") === 0 ||
                proto.indexOf("ws") === 0) {
            this._proto = new Strophe.Websocket(this);
        } else {
            this._proto = new Strophe.Bosh(this);
        }
    }

    /** Function: reset
     *  Reset the connection.
     *
     *  This function should be called after a connection is disconnected
     *  before that connection is reused.
     */
    reset () {
        this._proto._reset();

        // SASL
        this.do_session = false;
        this.do_bind = false;

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        this.authenticated = false;
        this.connected = false;
        this.disconnecting = false;
        this.restored = false;

        this._data = [];
        this._requests = [];
        this._uniqueId = 0;
    }

    /** Function: pause
     *  Pause the request manager.
     *
     *  This will prevent Strophe from sending any more requests to the
     *  server.  This is very useful for temporarily pausing
     *  BOSH-Connections while a lot of send() calls are happening quickly.
     *  This causes Strophe to send the data in a single request, saving
     *  many request trips.
     */
    pause () {
        this.paused = true;
    }

    /** Function: resume
     *  Resume the request manager.
     *
     *  This resumes after pause() has been called.
     */
    resume () {
        this.paused = false;
    }

    /** Function: getUniqueId
     *  Generate a unique ID for use in <iq/> elements.
     *
     *  All <iq/> stanzas are required to have unique id attributes.  This
     *  function makes creating these easy.  Each connection instance has
     *  a counter which starts from zero, and the value of this counter
     *  plus a colon followed by the suffix becomes the unique id. If no
     *  suffix is supplied, the counter is used as the unique id.
     *
     *  Suffixes are used to make debugging easier when reading the stream
     *  data, and their use is recommended.  The counter resets to 0 for
     *  every new connection for the same reason.  For connections to the
     *  same server that authenticate the same way, all the ids should be
     *  the same, which makes it easy to see changes.  This is useful for
     *  automated testing as well.
     *
     *  Parameters:
     *    (String) suffix - A optional suffix to append to the id.
     *
     *  Returns:
     *    A unique string to be used for the id attribute.
     */
    getUniqueId (suffix) { // eslint-disable-line class-methods-use-this
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0,
                  v = c === 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
        if (typeof(suffix) === "string" || typeof(suffix) === "number") {
            return uuid + ":" + suffix;
        } else {
            return uuid + "";
        }
    }

    /** Function: addProtocolErrorHandler
     *  Register a handler function for when a protocol (websocker or HTTP)
     *  error occurs.
     *
     *  NOTE: Currently only HTTP errors for BOSH requests are handled.
     *  Patches that handle websocket errors would be very welcome.
     *
     *  Parameters:
     *    (String) protocol - 'HTTP' or 'websocket'
     *    (Integer) status_code - Error status code (e.g 500, 400 or 404)
     *    (Function) callback - Function that will fire on Http error
     *
     *  Example:
     *  function onError(err_code){
     *    //do stuff
     *  }
     *
     *  let conn = Strophe.connect('http://example.com/http-bind');
     *  conn.addProtocolErrorHandler('HTTP', 500, onError);
     *  // Triggers HTTP 500 error and onError handler will be called
     *  conn.connect('user_jid@incorrect_jabber_host', 'secret', onConnect);
     */
    addProtocolErrorHandler (protocol, status_code, callback){
        this.protocolErrorHandlers[protocol][status_code] = callback;
    }

    /** Function: connect
     *  Starts the connection process.
     *
     *  As the connection process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  The Parameters _wait_, _hold_ and _route_ are optional and only relevant
     *  for BOSH connections. Please see XEP 124 for a more detailed explanation
     *  of the optional parameters.
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID,
     *      or a full JID.  If a node is not supplied, SASL OAUTHBEARER or
     *      SASL ANONYMOUS authentication will be attempted (OAUTHBEARER will
     *      process the provided password value as an access token).
     *    (String) pass - The user's password.
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (String) route - The optional route value.
     *    (String) authcid - The optional alternative authentication identity
     *      (username) if intending to impersonate another user.
     *      When using the SASL-EXTERNAL authentication mechanism, for example
     *      with client certificates, then the authcid value is used to
     *      determine whether an authorization JID (authzid) should be sent to
     *      the server. The authzid should NOT be sent to the server if the
     *      authzid and authcid are the same. So to prevent it from being sent
     *      (for example when the JID is already contained in the client
     *      certificate), set authcid to that same JID. See XEP-178 for more
     *      details.
     *     (Integer) disconnection_timeout - The optional disconnection timeout
     *      in milliseconds before _doDisconnect will be called.
     */
    connect (jid, pass, callback, wait, hold, route, authcid, disconnection_timeout = 3000) {
        this.jid = jid;
        /** Variable: authzid
         *  Authorization identity.
         */
        this.authzid = Strophe.getBareJidFromJid(this.jid);

        /** Variable: authcid
         *  Authentication identity (User name).
         */
        this.authcid = authcid || Strophe.getNodeFromJid(this.jid);

        /** Variable: pass
         *  Authentication identity (User password).
         */
        this.pass = pass;

        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.restored = false;
        this.disconnection_timeout = disconnection_timeout;

        // parse jid for domain
        this.domain = Strophe.getDomainFromJid(this.jid);

        this._changeConnectStatus(Strophe.Status.CONNECTING, null);

        this._proto._connect(wait, hold, route);
    }

    /** Function: attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    attach (jid, sid, rid, callback, wait, hold, wind) {
        if (this._proto._attach) {
            return this._proto._attach(jid, sid, rid, callback, wait, hold, wind);
        } else {
            const error = new Error('The "attach" method is not available for your connection protocol');
            error.name = 'StropheSessionError';
            throw error;
        }
    }

    /** Function: restore
     *  Attempt to restore a cached BOSH session.
     *
     *  This function is only useful in conjunction with providing the
     *  "keepalive":true option when instantiating a new Strophe.Connection.
     *
     *  When "keepalive" is set to true, Strophe will cache the BOSH tokens
     *  RID (Request ID) and SID (Session ID) and then when this function is
     *  called, it will attempt to restore the session from those cached
     *  tokens.
     *
     *  This function must therefore be called instead of connect or attach.
     *
     *  For an example on how to use it, please see examples/restore.js
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID or a full JID.
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    restore (jid, callback, wait, hold, wind) {
        if (this._sessionCachingSupported()) {
            this._proto._restore(jid, callback, wait, hold, wind);
        } else {
            const error = new Error('The "restore" method can only be used with a BOSH connection.');
            error.name = 'StropheSessionError';
            throw error;
        }
    }

    /** PrivateFunction: _sessionCachingSupported
     * Checks whether sessionStorage and JSON are supported and whether we're
     * using BOSH.
     */
    _sessionCachingSupported () {
        if (this._proto instanceof Strophe.Bosh) {
            if (!JSON) { return false; }
            try {
                sessionStorage.setItem('_strophe_', '_strophe_');
                sessionStorage.removeItem('_strophe_');
            } catch (e) {
                return false;
            }
            return true;
        }
        return false;
    }

    /** Function: xmlInput
     *  User overrideable function that receives XML data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlInput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML data received by the connection.
     */
    xmlInput (elem) { // eslint-disable-line
        return;
    }

    /** Function: xmlOutput
     *  User overrideable function that receives XML data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlOutput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Due to limitations of current Browsers' XML-Parsers the opening and closing
     *  <stream> tag for WebSocket-Connoctions will be passed as selfclosing here.
     *
     *  BOSH-Connections will have all stanzas wrapped in a <body> tag. See
     *  <Strophe.Bosh.strip> if you want to strip this tag.
     *
     *  Parameters:
     *    (XMLElement) elem - The XMLdata sent by the connection.
     */
    xmlOutput (elem) { // eslint-disable-line
        return;
    }

    /** Function: rawInput
     *  User overrideable function that receives raw data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawInput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data received by the connection.
     */
    rawInput (data) { // eslint-disable-line
        return;
     }

    /** Function: rawOutput
     *  User overrideable function that receives raw data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawOutput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data sent by the connection.
     */
    rawOutput (data) { // eslint-disable-line
        return;
    }

    /** Function: nextValidRid
     *  User overrideable function that receives the new valid rid.
     *
     *  The default function does nothing. User code can override this with
     *  > Strophe.Connection.nextValidRid = function (rid) {
     *  >    (user code)
     *  > };
     *
     *  Parameters:
     *    (Number) rid - The next valid rid
     */
    nextValidRid (rid) { // eslint-disable-line
        return;
    }

    /** Function: send
     *  Send a stanza.
     *
     *  This function is called to push data onto the send queue to
     *  go out over the wire.  Whenever a request is sent to the BOSH
     *  server, all pending data is sent and the queue is flushed.
     *
     *  Parameters:
     *    (XMLElement |
     *     [XMLElement] |
     *     Strophe.Builder) elem - The stanza to send.
     */
    send (elem) {
        if (elem === null) { return ; }
        if (typeof(elem.sort) === "function") {
            for (let i=0; i < elem.length; i++) {
                this._queueData(elem[i]);
            }
        } else if (typeof(elem.tree) === "function") {
            this._queueData(elem.tree());
        } else {
            this._queueData(elem);
        }
        this._proto._send();
    }

    /** Function: flush
     *  Immediately send any pending outgoing data.
     *
     *  Normally send() queues outgoing data until the next idle period
     *  (100ms), which optimizes network use in the common cases when
     *  several send()s are called in succession. flush() can be used to
     *  immediately send all pending data.
     */
    flush () {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    }

    /** Function: sendPresence
     *  Helper function to send presence stanzas. The main benefit is for
     *  sending presence stanzas for which you expect a responding presence
     *  stanza with the same id (for example when leaving a chat room).
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the presence.
     */
    sendPresence (elem, callback, errback, timeout) {
        let timeoutHandler = null;
        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
        let id = elem.getAttribute('id');
        if (!id) { // inject id if not found
            id = this.getUniqueId("sendPresence");
            elem.setAttribute("id", id);
        }

        if (typeof callback === "function" || typeof errback === "function") {
            const handler = this.addHandler(stanza => {
                // remove timeout handler if there is one
                if (timeoutHandler) {
                    this.deleteTimedHandler(timeoutHandler);
                }
                if (stanza.getAttribute('type') === 'error') {
                    if (errback) {
                        errback(stanza);
                    }
                } else if (callback) {
                    callback(stanza);
                }
            }, null, 'presence', null, id);

            // if timeout specified, set up a timeout handler.
            if (timeout) {
                timeoutHandler = this.addTimedHandler(timeout, () => {
                    // get rid of normal handler
                    this.deleteHandler(handler);
                    // call errback on timeout with null stanza
                    if (errback) {
                        errback(null);
                    }
                    return false;
                });
            }
        }
        this.send(elem);
        return id;
    }

    /** Function: sendIQ
     *  Helper function to send IQ stanzas.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the IQ.
    */
    sendIQ (elem, callback, errback, timeout) {
        let timeoutHandler = null;
        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
        let id = elem.getAttribute('id');
        if (!id) { // inject id if not found
            id = this.getUniqueId("sendIQ");
            elem.setAttribute("id", id);
        }

        if (typeof callback === "function" || typeof errback === "function") {
            const handler = this.addHandler(stanza => {
                // remove timeout handler if there is one
                if (timeoutHandler) {
                    this.deleteTimedHandler(timeoutHandler);
                }
                const iqtype = stanza.getAttribute('type');
                if (iqtype === 'result') {
                    if (callback) {
                        callback(stanza);
                    }
                } else if (iqtype === 'error') {
                    if (errback) {
                        errback(stanza);
                    }
                } else {
                    const error = new Error(`Got bad IQ type of ${iqtype}`);
                    error.name = "StropheError";
                    throw(error);
                }
            }, null, 'iq', ['error', 'result'], id);

            // if timeout specified, set up a timeout handler.
            if (timeout) {
                timeoutHandler = this.addTimedHandler(timeout, () => {
                    // get rid of normal handler
                    this.deleteHandler(handler);
                    // call errback on timeout with null stanza
                    if (errback) {
                        errback(null);
                    }
                    return false;
                });
            }
        }
        this.send(elem);
        return id;
    }

    /** PrivateFunction: _queueData
     *  Queue outgoing data for later sending.  Also ensures that the data
     *  is a DOMElement.
     */
    _queueData (element) {
        if (element === null ||
                !element.tagName ||
                !element.childNodes) {
            const error = new Error("Cannot queue non-DOMElement.");
            error.name = "StropheError";
            throw(error);
        }
        this._data.push(element);
    }

    /** PrivateFunction: _sendRestart
     *  Send an xmpp:restart stanza.
     */
    _sendRestart () {
        this._data.push("restart");
        this._proto._sendRestart();
        this._idleTimeout = setTimeout(() => this._onIdle(), 100);
    }

    /** Function: addTimedHandler
     *  Add a timed handler to the connection.
     *
     *  This function adds a timed handler.  The provided handler will
     *  be called every period milliseconds until it returns false,
     *  the connection is terminated, or the handler is removed.  Handlers
     *  that wish to continue being invoked should return true.
     *
     *  Because of method binding it is necessary to save the result of
     *  this function if you wish to remove a handler with
     *  deleteTimedHandler().
     *
     *  Note that user handlers are not active until authentication is
     *  successful.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addTimedHandler (period, handler) {
        const thand = new Strophe.TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    }

    /** Function: deleteTimedHandler
     *  Delete a timed handler for a connection.
     *
     *  This function removes a timed handler from the connection.  The
     *  handRef parameter is *not* the function passed to addTimedHandler(),
     *  but is the reference returned from addTimedHandler().
     *
     *  Parameters:
     *    (Strophe.TimedHandler) handRef - The handler reference.
     */
    deleteTimedHandler (handRef) {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    }

    /** Function: addHandler
     *  Add a stanza handler for the connection.
     *
     *  This function adds a stanza handler to the connection.  The
     *  handler callback will be called for any stanza that matches
     *  the parameters.  Note that if multiple parameters are supplied,
     *  they must all match for the handler to be invoked.
     *
     *  The handler will receive the stanza that triggered it as its argument.
     *  *The handler should return true if it is to be invoked again;
     *  returning false will remove the handler after it returns.*
     *
     *  As a convenience, the ns parameters applies to the top level element
     *  and also any of its immediate children.  This is primarily to make
     *  matching /iq/query elements easy.
     *
     *  Options
     *  ~~~~~~~
     *  With the options argument, you can specify boolean flags that affect how
     *  matches are being done.
     *
     *  Currently two flags exist:
     *
     *  - matchBareFromJid:
     *      When set to true, the from parameter and the
     *      from attribute on the stanza will be matched as bare JIDs instead
     *      of full JIDs. To use this, pass {matchBareFromJid: true} as the
     *      value of options. The default value for matchBareFromJid is false.
     *
     *  - ignoreNamespaceFragment:
     *      When set to true, a fragment specified on the stanza's namespace
     *      URL will be ignored when it's matched with the one configured for
     *      the handler.
     *
     *      This means that if you register like this:
     *      >   connection.addHandler(
     *      >       handler,
     *      >       'http://jabber.org/protocol/muc',
     *      >       null, null, null, null,
     *      >       {'ignoreNamespaceFragment': true}
     *      >   );
     *
     *      Then a stanza with XML namespace of
     *      'http://jabber.org/protocol/muc#user' will also be matched. If
     *      'ignoreNamespaceFragment' is false, then only stanzas with
     *      'http://jabber.org/protocol/muc' will be matched.
     *
     *  Deleting the handler
     *  ~~~~~~~~~~~~~~~~~~~~
     *  The return value should be saved if you wish to remove the handler
     *  with deleteHandler().
     *
     *  Parameters:
     *    (Function) handler - The user callback.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String|Array) type - The stanza type (or types if an array) to match.
     *    (String) id - The stanza id attribute to match.
     *    (String) from - The stanza from attribute to match.
     *    (String) options - The handler options
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addHandler (handler, ns, name, type, id, from, options) {
        const hand = new Strophe.Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    }

    /** Function: deleteHandler
     *  Delete a stanza handler for a connection.
     *
     *  This function removes a stanza handler from the connection.  The
     *  handRef parameter is *not* the function passed to addHandler(),
     *  but is the reference returned from addHandler().
     *
     *  Parameters:
     *    (Strophe.Handler) handRef - The handler reference.
     */
    deleteHandler (handRef) {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeHandlers.push(handRef);
        // If a handler is being deleted while it is being added,
        // prevent it from getting added
        const i = this.addHandlers.indexOf(handRef);
        if (i >= 0) {
            this.addHandlers.splice(i, 1);
        }
    }

    /** Function: registerSASLMechanisms
     *
     * Register the SASL mechanisms which will be supported by this instance of
     * Strophe.Connection (i.e. which this XMPP client will support).
     *
     *  Parameters:
     *    (Array) mechanisms - Array of objects with Strophe.SASLMechanism prototypes
     *
     */
    registerSASLMechanisms (mechanisms) {
        this.mechanisms = {};
        mechanisms = mechanisms || [
            Strophe.SASLAnonymous,
            Strophe.SASLExternal,
            Strophe.SASLOAuthBearer,
            Strophe.SASLXOAuth2,
            Strophe.SASLPlain,
            Strophe.SASLSHA1
        ];
        mechanisms.forEach(m => this.registerSASLMechanism(m));
    }

    /** Function: registerSASLMechanism
     *
     * Register a single SASL mechanism, to be supported by this client.
     *
     *  Parameters:
     *    (Object) mechanism - Object with a Strophe.SASLMechanism prototype
     *
     */
    registerSASLMechanism (Mechanism) {
        const mechanism = new Mechanism()
        this.mechanisms[mechanism.mechname] = mechanism;
    }

    /** Function: disconnect
     *  Start the graceful disconnection process.
     *
     *  This function starts the disconnection process.  This process starts
     *  by sending unavailable presence and sending BOSH body of type
     *  terminate.  A timeout handler makes sure that disconnection happens
     *  even if the BOSH server does not respond.
     *  If the Connection object isn't connected, at least tries to abort all pending requests
     *  so the connection object won't generate successful requests (which were already opened).
     *
     *  The user supplied connection callback will be notified of the
     *  progress as this process happens.
     *
     *  Parameters:
     *    (String) reason - The reason the disconnect is occuring.
     */
    disconnect (reason) {
        this._changeConnectStatus(Strophe.Status.DISCONNECTING, reason);
        if (reason) {
            Strophe.warn("Disconnect was called because: " + reason);
        } else {
            Strophe.info("Disconnect was called");
        }
        if (this.connected) {
            let pres = false;
            this.disconnecting = true;
            if (this.authenticated) {
                pres = $pres({
                    'xmlns': Strophe.NS.CLIENT,
                    'type': 'unavailable'
                });
            }
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                this.disconnection_timeout, this._onDisconnectTimeout.bind(this));
            this._proto._disconnect(pres);
        } else {
            Strophe.warn("Disconnect was called before Strophe connected to the server");
            this._proto._abortAllRequests();
            this._doDisconnect();
        }
    }

    /** PrivateFunction: _changeConnectStatus
     *  _Private_ helper function that makes sure plugins and the user's
     *  callback are notified of connection status changes.
     *
     *  Parameters:
     *    (Integer) status - the new connection status, one of the values
     *      in Strophe.Status
     *    (String) condition - the error condition or null
     *    (XMLElement) elem - The triggering stanza.
     */
    _changeConnectStatus (status, condition, elem) {
        // notify all plugins listening for status changes
        for (const k in Strophe._connectionPlugins) {
            if (Object.prototype.hasOwnProperty.call(Strophe._connectionPlugins, k)) {
                const plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        Strophe.error(`${k} plugin caused an exception changing status: ${err}`);
                    }
                }
            }
        }
        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition, elem);
            } catch (e) {
                Strophe._handleError(e);
                Strophe.error(`User connection callback caused an exception: ${e}`);
            }
        }
    }

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  This is the last piece of the disconnection logic.  This resets the
     *  connection and alerts the user's connection callback.
     */
    _doDisconnect (condition) {
        if (typeof this._idleTimeout === "number") {
            clearTimeout(this._idleTimeout);
        }

        // Cancel Disconnect Timeout
        if (this._disconnectTimeout !== null) {
            this.deleteTimedHandler(this._disconnectTimeout);
            this._disconnectTimeout = null;
        }

        Strophe.debug("_doDisconnect was called");
        this._proto._doDisconnect();

        this.authenticated = false;
        this.disconnecting = false;
        this.restored = false;

        // delete handlers
        this.handlers = [];
        this.timedHandlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];

        // tell the parent we disconnected
        this._changeConnectStatus(Strophe.Status.DISCONNECTED, condition);
        this.connected = false;
    }

    /** PrivateFunction: _dataRecv
     *  _Private_ handler to processes incoming data from the the connection.
     *
     *  Except for _connect_cb handling the initial connection request,
     *  this function handles the incoming data for all requests.  This
     *  function also fires stanza handlers that match each incoming
     *  stanza.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request that has data ready.
     *    (string) req - The stanza a raw string (optiona).
     */
    _dataRecv (req, raw) {

        const elem = this._proto._reqToData(req);
        if (elem === null) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (elem.nodeName === this._proto.strip && elem.childNodes.length) {
                this.xmlInput(elem.childNodes[0]);
            } else {
                this.xmlInput(elem);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(elem));
            }
        }

        // remove handlers scheduled for deletion
        while (this.removeHandlers.length > 0) {
            const hand = this.removeHandlers.pop();
            const i = this.handlers.indexOf(hand);
            if (i >= 0) {
                this.handlers.splice(i, 1);
            }
        }

        // add handlers scheduled for addition
        while (this.addHandlers.length > 0) {
            this.handlers.push(this.addHandlers.pop());
        }

        // handle graceful disconnect
        if (this.disconnecting && this._proto._emptyQueue()) {
            this._doDisconnect();
            return;
        }

        const type = elem.getAttribute("type");
        if (type !== null && type === "terminate") {
            // Don't process stanzas that come in after disconnect
            if (this.disconnecting) {
                return;
            }
            // an error occurred
            let cond = elem.getAttribute("condition");
            const conflict = elem.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond === "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(
                    Strophe.Status.CONNFAIL,
                    Strophe.ErrorCondition.UNKOWN_REASON
                );
            }
            this._doDisconnect(cond);
            return;
        }

        // send each incoming stanza through the handler chain
        Strophe.forEachChild(elem, null, (child) => {
            const matches = [];
            this.handlers = this.handlers.reduce((handlers, handler) => {
                try {
                    if (handler.isMatch(child) &&
                        (this.authenticated || !handler.user)) {
                        if (handler.run(child)) {
                            handlers.push(handler);
                        }
                        matches.push(handler);
                    } else {
                        handlers.push(handler);
                    }

                } catch (e) {
                    // if the handler throws an exception, we consider it as false
                    Strophe.warn('Removing Strophe handlers due to uncaught exception: '+e.message);
                }

                return handlers;
            }, []);

            // If no handler was fired for an incoming IQ with type="set",
            // then we return an IQ error stanza with service-unavailable.
            if (!matches.length && this.iqFallbackHandler.isMatch(child)) {
                this.iqFallbackHandler.run(child);
            }
        });
    }

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the initial connection request
     *  response from the BOSH server. It is used to set up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Strophe.Request) req - The current request.
     *    (Function) _callback - low level (xmpp) connect callback function.
     *      Useful for plugins with their own xmpp connect callback (when they
     *      want to do something special).
     */
    _connect_cb (req, _callback, raw) {
        Strophe.debug("_connect_cb was called");
        this.connected = true;

        let bodyWrap;
        try {
            bodyWrap = this._proto._reqToData(req);
        } catch (e) {
            if (e.name !== Strophe.ErrorCondition.BAD_FORMAT) { throw e; }
            this._changeConnectStatus(
                Strophe.Status.CONNFAIL,
                Strophe.ErrorCondition.BAD_FORMAT
            );
            this._doDisconnect(Strophe.ErrorCondition.BAD_FORMAT);
        }
        if (!bodyWrap) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            if (bodyWrap.nodeName === this._proto.strip && bodyWrap.childNodes.length) {
                this.xmlInput(bodyWrap.childNodes[0]);
            } else {
                this.xmlInput(bodyWrap);
            }
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            if (raw) {
                this.rawInput(raw);
            } else {
                this.rawInput(Strophe.serialize(bodyWrap));
            }
        }

        const conncheck = this._proto._connect_cb(bodyWrap);
        if (conncheck === Strophe.Status.CONNFAIL) {
            return;
        }

        // Check for the stream:features tag
        let hasFeatures;
        if (bodyWrap.getElementsByTagNameNS) {
            hasFeatures = bodyWrap.getElementsByTagNameNS(Strophe.NS.STREAM, "features").length > 0;
        } else {
            hasFeatures = bodyWrap.getElementsByTagName("stream:features").length > 0 ||
                            bodyWrap.getElementsByTagName("features").length > 0;
        }
        if (!hasFeatures) {
            this._proto._no_auth_received(_callback);
            return;
        }

        const matched = Array.from(bodyWrap.getElementsByTagName("mechanism"))
            .map(m => this.mechanisms[m.textContent])
            .filter(m => m);

        if (matched.length === 0) {
            if (bodyWrap.getElementsByTagName("auth").length === 0) {
                // There are no matching SASL mechanisms and also no legacy
                // auth available.
                this._proto._no_auth_received(_callback);
                return;
            }
        }
        if (this.do_authentication !== false) {
            this.authenticate(matched);
        }
    }

    /** Function: sortMechanismsByPriority
     *
     *  Sorts an array of objects with prototype SASLMechanism according to
     *  their priorities.
     *
     *  Parameters:
     *    (Array) mechanisms - Array of SASL mechanisms.
     *
     */
    sortMechanismsByPriority (mechanisms) { // eslint-disable-line class-methods-use-this
        // Sorting mechanisms according to priority.
        for (let i=0; i < mechanisms.length - 1; ++i) {
            let higher = i;
            for (let j=i + 1; j < mechanisms.length; ++j) {
                if (mechanisms[j].priority > mechanisms[higher].priority) {
                    higher = j;
                }
            }
            if (higher !== i) {
                const swap = mechanisms[i];
                mechanisms[i] = mechanisms[higher];
                mechanisms[higher] = swap;
            }
        }
        return mechanisms;
    }

    /** Function: authenticate
     * Set up authentication
     *
     *  Continues the initial connection request by setting up authentication
     *  handlers and starting the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Array) matched - Array of SASL mechanisms supported.
     *
     */
    authenticate (matched) {
        if (!this._attemptSASLAuth(matched)) {
            this._attemptLegacyAuth();
        }
    }

    /** PrivateFunction: _attemptSASLAuth
     *
     *  Iterate through an array of SASL mechanisms and attempt authentication
     *  with the highest priority (enabled) mechanism.
     *
     *  Parameters:
     *    (Array) mechanisms - Array of SASL mechanisms.
     *
     *  Returns:
     *    (Boolean) mechanism_found - true or false, depending on whether a
     *          valid SASL mechanism was found with which authentication could be
     *          started.
     */
    _attemptSASLAuth (mechanisms) {
        mechanisms = this.sortMechanismsByPriority(mechanisms || []);
        let mechanism_found = false;
        for (let i=0; i < mechanisms.length; ++i) {
            if (!mechanisms[i].test(this)) {
                continue;
            }
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this), null,
                "success", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_challenge_cb.bind(this), null,
                "challenge", null, null);

            this._sasl_mechanism = mechanisms[i];
            this._sasl_mechanism.onStart(this);

            const request_auth_exchange = $build("auth", {
                'xmlns': Strophe.NS.SASL,
                'mechanism': this._sasl_mechanism.mechname
            });
            if (this._sasl_mechanism.isClientFirst) {
                const response = this._sasl_mechanism.clientChallenge(this);
                request_auth_exchange.t(btoa(response));
            }
            this.send(request_auth_exchange.tree());
            mechanism_found = true;
            break;
        }
        return mechanism_found;
    }

    /** PrivateFunction: _sasl_challenge_cb
     *  _Private_ handler for the SASL challenge
     *
     */
    _sasl_challenge_cb (elem) {
      const challenge = atob(Strophe.getText(elem));
      const response = this._sasl_mechanism.onChallenge(this, challenge);
      const stanza = $build('response', {'xmlns': Strophe.NS.SASL});
      if (response !== "") {
        stanza.t(btoa(response));
      }
      this.send(stanza.tree());
      return true;
    }

    /** PrivateFunction: _attemptLegacyAuth
     *
     *  Attempt legacy (i.e. non-SASL) authentication.
     */
    _attemptLegacyAuth () {
        if (Strophe.getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(
                Strophe.Status.CONNFAIL,
                Strophe.ErrorCondition.MISSING_JID_NODE
            );
            this.disconnect(Strophe.ErrorCondition.MISSING_JID_NODE);
        } else {
            // Fall back to legacy authentication
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._addSysHandler(
                this._onLegacyAuthIQResult.bind(this),
                null, null, null, "_auth_1"
            );
            this.send($iq({
                    'type': "get",
                    'to': this.domain,
                    'id': "_auth_1"
                }).c("query", {xmlns: Strophe.NS.AUTH})
                .c("username", {}).t(Strophe.getNodeFromJid(this.jid))
                .tree());
        }
    }

    /** PrivateFunction: _onLegacyAuthIQResult
     *  _Private_ handler for legacy authentication.
     *
     *  This handler is called in response to the initial <iq type='get'/>
     *  for legacy authentication.  It builds an authentication <iq/> and
     *  sends it, creating a handler (calling back to _auth2_cb()) to
     *  handle the result
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onLegacyAuthIQResult (elem) { // eslint-disable-line no-unused-vars
        // build plaintext auth iq
        const iq = $iq({type: "set", id: "_auth_2"})
            .c('query', {xmlns: Strophe.NS.AUTH})
            .c('username', {}).t(Strophe.getNodeFromJid(this.jid))
            .up()
            .c('password').t(this.pass);

        if (!Strophe.getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = Strophe.getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(Strophe.getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null, null, null, "_auth_2");
        this.send(iq.tree());
        return false;
    }

    /** PrivateFunction: _sasl_success_cb
     *  _Private_ handler for succesful SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_success_cb (elem) {
        if (this._sasl_data["server-signature"]) {
            let serverSignature;
            const success = atob(Strophe.getText(elem));
            const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
            const matches = success.match(attribMatch);
            if (matches[1] === "v") {
                serverSignature = matches[2];
            }
            if (serverSignature !== this._sasl_data["server-signature"]) {
                // remove old handlers
                this.deleteHandler(this._sasl_failure_handler);
                this._sasl_failure_handler = null;
                if (this._sasl_challenge_handler) {
                    this.deleteHandler(this._sasl_challenge_handler);
                    this._sasl_challenge_handler = null;
                }
                this._sasl_data = {};
                return this._sasl_failure_cb(null);
            }
        }
        Strophe.info("SASL authentication succeeded.");

        if (this._sasl_mechanism) {
            this._sasl_mechanism.onSuccess();
        }
        // remove old handlers
        this.deleteHandler(this._sasl_failure_handler);
        this._sasl_failure_handler = null;
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }
        const streamfeature_handlers = [];
        const wrapper = (handlers, elem) => {
            while (handlers.length) {
                this.deleteHandler(handlers.pop());
            }
            this._onStreamFeaturesAfterSASL(elem);
            return false;
        };
        streamfeature_handlers.push(
            this._addSysHandler(elem => wrapper(streamfeature_handlers, elem),
            null, "stream:features", null, null)
        );

        streamfeature_handlers.push(
            this._addSysHandler(elem => wrapper(streamfeature_handlers, elem),
            Strophe.NS.STREAM, "features", null, null)
        );

        // we must send an xmpp:restart now
        this._sendRestart();
        return false;
    }

    /** PrivateFunction: _onStreamFeaturesAfterSASL
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
     _onStreamFeaturesAfterSASL (elem) {
        // save stream:features for future usage
        this.features = elem;
        for (let i=0; i < elem.childNodes.length; i++) {
            const child = elem.childNodes[i];
            if (child.nodeName === 'bind') {
                this.do_bind = true;
            }
            if (child.nodeName === 'session') {
                this.do_session = true;
            }
        }

        if (!this.do_bind) {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        } else if (!this.options.explicitResourceBinding) {
            this.bind();
        } else {
            this._changeConnectStatus(Strophe.Status.BINDREQUIRED, null);
        }
        return false;
    }

    /** Function: bind
     *
     *  Sends an IQ to the XMPP server to bind a JID resource for this session.
     *
     *  https://tools.ietf.org/html/rfc6120#section-7.5
     *
     *  If `explicitResourceBinding` was set to a truthy value in the options
     *  passed to the Strophe.Connection constructor, then this function needs
     *  to be called explicitly by the client author.
     *
     *  Otherwise it'll be called automatically as soon as the XMPP server
     *  advertises the "urn:ietf:params:xml:ns:xmpp-bind" stream feature.
     */
    bind () {
        if (!this.do_bind) {
            Strophe.log(
                 Strophe.LogLevel.INFO,
                `Strophe.Connection.prototype.bind called but "do_bind" is false`
            );
            return;
        }
        this._addSysHandler(
            this._onResourceBindResultIQ.bind(this),
            null, null, null, "_bind_auth_2");

        const resource = Strophe.getResourceFromJid(this.jid);
        if (resource) {
            this.send($iq({type: "set", id: "_bind_auth_2"})
                      .c('bind', {xmlns: Strophe.NS.BIND})
                      .c('resource', {}).t(resource).tree());
        } else {
            this.send($iq({type: "set", id: "_bind_auth_2"})
                      .c('bind', {xmlns: Strophe.NS.BIND})
                      .tree());
        }
    }

    /** PrivateFunction: _onResourceBindIQ
     *  _Private_ handler for binding result and session start.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onResourceBindResultIQ (elem) {
        if (elem.getAttribute("type") === "error") {
            Strophe.warn("Resource binding failed.");
            const conflict = elem.getElementsByTagName("conflict");
            let condition;
            if (conflict.length > 0) {
                condition = Strophe.ErrorCondition.CONFLICT;
            }
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, condition, elem);
            return false;
        }
        // TODO - need to grab errors
        const bind = elem.getElementsByTagName("bind");
        if (bind.length > 0) {
            const jidNode = bind[0].getElementsByTagName("jid");
            if (jidNode.length > 0) {
                this.authenticated = true;
                this.jid = Strophe.getText(jidNode[0]);
                if (this.do_session) {
                    this._establishSession();
                } else {
                    this._changeConnectStatus(Strophe.Status.CONNECTED, null);
                }
            }
        } else {
            Strophe.warn("Resource binding failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null, elem);
            return false;
        }
    }

    /** PrivateFunction: _establishSession
     *  Send IQ request to establish a session with the XMPP server.
     *
     *  See https://xmpp.org/rfcs/rfc3921.html#session
     *
     *  Note: The protocol for session establishment has been determined as
     *  unnecessary and removed in RFC-6121.
     */
    _establishSession () {
        if (!this.do_session) {
            throw new Error(`Strophe.Connection.prototype._establishSession `+
                `called but apparently ${Strophe.NS.SESSION} wasn't advertised by the server`);
        }
        this._addSysHandler(
            this._onSessionResultIQ.bind(this),
            null, null, null, "_session_auth_2");

        this.send(
            $iq({type: "set", id: "_session_auth_2"})
                .c('session', {xmlns: Strophe.NS.SESSION})
                .tree());
    }

    /** PrivateFunction: _onSessionResultIQ
     *  _Private_ handler for the server's IQ response to a client's session
     *  request.
     *
     *  This sets Connection.authenticated to true on success, which
     *  starts the processing of user handlers.
     *
     *  See https://xmpp.org/rfcs/rfc3921.html#session
     *
     *  Note: The protocol for session establishment has been determined as
     *  unnecessary and removed in RFC-6121.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onSessionResultIQ (elem) {
        if (elem.getAttribute("type") === "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") === "error") {
            this.authenticated = false;
            Strophe.warn("Session creation failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null, elem);
            return false;
        }
        return false;
    }

    /** PrivateFunction: _sasl_failure_cb
     *  _Private_ handler for SASL authentication failure.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_failure_cb (elem) {
        // delete unneeded handlers
        if (this._sasl_success_handler) {
            this.deleteHandler(this._sasl_success_handler);
            this._sasl_success_handler = null;
        }
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        if(this._sasl_mechanism)
          this._sasl_mechanism.onFailure();
        this._changeConnectStatus(Strophe.Status.AUTHFAIL, null, elem);
        return false;
    }

    /** PrivateFunction: _auth2_cb
     *  _Private_ handler to finish legacy authentication.
     *
     *  This handler is called when the result from the jabber:iq:auth
     *  <iq/> stanza is returned.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth2_cb (elem) {
        if (elem.getAttribute("type") === "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") === "error") {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null, elem);
            this.disconnect('authentication failed');
        }
        return false;
    }

    /** PrivateFunction: _addSysTimedHandler
     *  _Private_ function to add a system level timed handler.
     *
     *  This function is used to add a Strophe.TimedHandler for the
     *  library code.  System timed handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     */
    _addSysTimedHandler (period, handler) {
        const thand = new Strophe.TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    }

    /** PrivateFunction: _addSysHandler
     *  _Private_ function to add a system level stanza handler.
     *
     *  This function is used to add a Strophe.Handler for the
     *  library code.  System stanza handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Function) handler - The callback function.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     */
    _addSysHandler (handler, ns, name, type, id) {
        const hand = new Strophe.Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    }

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  If the graceful disconnect process does not complete within the
     *  time allotted, this handler finishes the disconnect anyway.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onDisconnectTimeout () {
        Strophe.debug("_onDisconnectTimeout was called");
        this._changeConnectStatus(Strophe.Status.CONNTIMEOUT, null);
        this._proto._onDisconnectTimeout();
        // actually disconnect
        this._doDisconnect();
        return false;
    }

    /** PrivateFunction: _onIdle
     *  _Private_ handler to process events during idle cycle.
     *
     *  This handler is called every 100ms to fire timed handlers that
     *  are ready and keep poll requests going.
     */
    _onIdle () {
        // add timed handlers scheduled for addition
        // NOTE: we add before remove in the case a timed handler is
        // added and then deleted before the next _onIdle() call.
        while (this.addTimeds.length > 0) {
            this.timedHandlers.push(this.addTimeds.pop());
        }

        // remove timed handlers that have been scheduled for deletion
        while (this.removeTimeds.length > 0) {
            const thand = this.removeTimeds.pop();
            const i = this.timedHandlers.indexOf(thand);
            if (i >= 0) {
                this.timedHandlers.splice(i, 1);
            }
        }

        // call ready timed handlers
        const now = new Date().getTime();
        const newList = [];
        for (let i=0; i < this.timedHandlers.length; i++) {
            const thand = this.timedHandlers[i];
            if (this.authenticated || !thand.user) {
                const since = thand.lastCalled + thand.period;
                if (since - now <= 0) {
                    if (thand.run()) {
                        newList.push(thand);
                    }
                } else {
                    newList.push(thand);
                }
            }
        }
        this.timedHandlers = newList;
        clearTimeout(this._idleTimeout);
        this._proto._onIdle();

        // reactivate the timer only if connected
        if (this.connected) {
            this._idleTimeout = setTimeout(() => this._onIdle(), 100);
        }
    }
};


Strophe.SASLMechanism = SASLMechanism;

/** Constants: SASL mechanisms
 *  Available authentication mechanisms
 *
 *  Strophe.SASLAnonymous   - SASL ANONYMOUS authentication.
 *  Strophe.SASLPlain       - SASL PLAIN authentication.
 *  Strophe.SASLSHA1        - SASL SCRAM-SHA-1 authentication
 *  Strophe.SASLOAuthBearer - SASL OAuth Bearer authentication
 *  Strophe.SASLExternal    - SASL EXTERNAL authentication
 *  Strophe.SASLXOAuth2     - SASL X-OAuth2 authentication
 */
Strophe.SASLAnonymous = SASLAnonymous;
Strophe.SASLPlain = SASLPlain;
Strophe.SASLSHA1 = SASLSHA1;
Strophe.SASLOAuthBearer = SASLOAuthBearer;
Strophe.SASLExternal = SASLExternal;
Strophe.SASLXOAuth2 = SASLXOAuth2;


export { SHA1, MD5 };

export default {
    'Strophe':         Strophe,
    '$build':          $build,
    '$iq':             $iq,
    '$msg':            $msg,
    '$pres':           $pres,
    'SHA1':            SHA1,
    'MD5':             MD5,
    'b64_hmac_sha1':   SHA1.b64_hmac_sha1,
    'b64_sha1':        SHA1.b64_sha1,
    'str_hmac_sha1':   SHA1.str_hmac_sha1,
    'str_sha1':        SHA1.str_sha1
};
