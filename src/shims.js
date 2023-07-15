/**
 * This module provides uniform
 * Shims APIs and globals that are not present in all JS environments,
 * the most common example for Strophe being browser APIs like WebSocket
 * and DOM that don't exist under nodejs.
 *
 * Usually these will be supplied in nodejs by conditionally requiring a
 * NPM module that provides a compatible implementation.
 */

/* global globalThis */

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
function getWebSocketImplementation() {
    if (typeof globalThis.WebSocket === 'undefined') {
        try {
            return require('ws');
        } catch (err) {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
    }
    return globalThis.WebSocket;
}
export const WebSocket = getWebSocketImplementation();

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
function getDOMParserImplementation() {
    let DOMParserImplementation = globalThis.DOMParser;
    if (typeof DOMParserImplementation === 'undefined') {
        try {
            DOMParserImplementation = require('@xmldom/xmldom').DOMParser;
        } catch (err) {
            throw new Error('You must install the "@xmldom/xmldom" package to use Strophe in nodejs.');
        }
    }
    return DOMParserImplementation;
}
export const DOMParser = getDOMParserImplementation();

/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - IE < 10: avoid using createDocument() due to a memory leak, use ie-specific
 *    workaround
 *  - other supported browsers: use document's createDocument
 *  - nodejs: use '@xmldom/xmldom'
 */
export function getDummyXMLDOMDocument() {
    if (typeof document === 'undefined') {
        // NodeJS
        try {
            const DOMImplementation = require('@xmldom/xmldom').DOMImplementation;
            return new DOMImplementation().createDocument('jabber:client', 'strophe', null);
        } catch (err) {
            throw new Error('You must install the "@xmldom/xmldom" package to use Strophe in nodejs.');
        }
    }
    return document.implementation.createDocument('jabber:client', 'strophe', null);
}
