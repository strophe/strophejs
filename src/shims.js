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
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
    }
    return globalThis.WebSocket;
}
export const WebSocket = getWebSocketImplementation();

/**
 * Retrieves the XMLSerializer implementation for the current environment.
 *
 * In browser environments, it uses the built-in XMLSerializer.
 * In Node.js environments, it attempts to load the 'jsdom' package
 * to create a compatible XMLSerializer.
 */
function getXMLSerializerImplementation() {
    if (typeof globalThis.XMLSerializer === 'undefined') {
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.XMLSerializer;
    }
    return globalThis.XMLSerializer;
}
export const XMLSerializer = getXMLSerializerImplementation();

/**
 * DOMParser
 * https://w3c.github.io/DOM-Parsing/#the-domparser-interface
 *
 * Interface to parse XML strings into Document objects
 *
 * Used implementations:
 * - supported browsers: built-in in DOMParser global
 *   https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
 * - nodejs: use 'jsdom' https://www.npmjs.com/package/jsdom
 */
function getDOMParserImplementation() {
    const DOMParserImplementation = globalThis.DOMParser;
    if (typeof DOMParserImplementation === 'undefined') {
        // NodeJS
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            throw new Error('You must install the "jsdom" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.DOMParser;
    }
    return DOMParserImplementation;
}
export const DOMParser = getDOMParserImplementation();

/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - browser: use document's createDocument
 * - nodejs: use 'jsdom' https://www.npmjs.com/package/jsdom
 */
export function getDummyXMLDOMDocument() {
    if (typeof document === 'undefined') {
        // NodeJS
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            throw new Error('You must install the "jsdom" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.document.implementation.createDocument('jabber:client', 'strophe', null);
    }
    return document.implementation.createDocument('jabber:client', 'strophe', null);
}
