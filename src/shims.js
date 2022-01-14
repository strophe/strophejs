/*
 * This module provides uniform
 * Shims APIs and globals that are not present in all JS environments,
 * the most common example for Strophe being browser APIs like WebSocket
 * and DOM that don't exist under nodejs.
 *
 * Usually these will be supplied in nodejs by conditionally requiring a
 * NPM module that provides a compatible implementation.
 */

/* global global */

/**
 * WHATWG WebSockets API
 * https://www.w3.org/TR/websockets/
 *
 * Interface to use the web socket protocol
 *
 * Used implementations:
 * - supported browsers: built-in in WebSocket global
 *   https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#Browser_compatibility
 * - nodejs: use standard-compliant 'ws' module
 *   https://www.npmjs.com/package/ws
 */
function getWebSocketImplementation () {
    let WebSocketImplementation = global.WebSocket;
    if (typeof WebSocketImplementation === 'undefined') {
        try {
            WebSocketImplementation = require('ws');
        } catch (err) {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
    }
    return WebSocketImplementation
}
export const WebSocket = getWebSocketImplementation()

/**
 * DOMParser
 * https://w3c.github.io/DOM-Parsing/#the-domparser-interface
 *
 * Interface to parse XML strings into Document objects
 *
 * Used implementations:
 * - supported browsers: built-in in DOMParser global
 *   https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
 * - nodejs: use '@xmldom/xmldom' module
 *   https://www.npmjs.com/package/@xmldom/xmldom
 */
function getDOMParserImplementation () {
    let DOMParserImplementation = global.DOMParser
    if (typeof DOMParserImplementation === 'undefined') {
        try {
            DOMParserImplementation = require('@xmldom/xmldom').DOMParser;
        } catch (err) {
            throw new Error('You must install the "@xmldom/xmldom" package to use Strophe in nodejs.');
        }
    }
    return DOMParserImplementation
}
export const DOMParser = getDOMParserImplementation()

/**
 *  Gets IE xml doc object. Used by getDummyXMLDocument shim.
 *
 *  Returns:
 *    A Microsoft XML DOM Object
 *  See Also:
 *    http://msdn.microsoft.com/en-us/library/ms757837%28VS.85%29.aspx
 */
function _getIEXmlDom () {
    const docStrings = [
        "Msxml2.DOMDocument.6.0",
        "Msxml2.DOMDocument.5.0",
        "Msxml2.DOMDocument.4.0",
        "MSXML2.DOMDocument.3.0",
        "MSXML2.DOMDocument",
        "MSXML.DOMDocument",
        "Microsoft.XMLDOM"
    ];
    for (let d = 0; d < docStrings.length; d++) {
        try {
            // eslint-disable-next-line no-undef
            const doc = new ActiveXObject(docStrings[d]);
            return doc
        } catch (e) {
            // Try next one
        }
    }
}

/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - IE < 10: avoid using createDocument() due to a memory leak, use ie-specific
 *    workaround
 *  - other supported browsers: use document's createDocument
 *  - nodejs: use '@xmldom/xmldom'
 */
export function getDummyXMLDOMDocument () {
    // nodejs
    if (typeof document === 'undefined') {
        try {
            const DOMImplementation = require('@xmldom/xmldom').DOMImplementation;
            return new DOMImplementation().createDocument('jabber:client', 'strophe', null);
        } catch (err) {
            throw new Error('You must install the "@xmldom/xmldom" package to use Strophe in nodejs.');
        }
    }
    // IE < 10
    if (
        document.implementation.createDocument === undefined ||
        document.implementation.createDocument && document.documentMode && document.documentMode < 10
    ) {
        const doc = _getIEXmlDom();
        doc.appendChild(doc.createElement('strophe'));
        return doc
    }
    // All other supported browsers
    return document.implementation.createDocument('jabber:client', 'strophe', null)
}
