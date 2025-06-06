/**
 * This module provides uniform
 * Shims APIs and globals that are not present in all JS environments,
 * the most common example for Strophe being browser APIs like WebSocket
 * and DOM that don't exist under nodejs.
 *
 * Usually these will be supplied in nodejs by conditionally requiring a
 * NPM module that provides a compatible implementation.
 */

/* global globalThis, process */

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
    if (typeof globalThis.WebSocket !== 'undefined') {
        return globalThis.WebSocket;
    }

    // Only try to require ws if we're in Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
            return require('ws');
        } catch {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
    }

    throw new Error(
        'WebSocket implementation not found. In browsers, WebSocket should be available globally. In Node.js, you need to install the "ws" package.'
    );
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
    if (typeof globalThis.XMLSerializer !== 'undefined') {
        return globalThis.XMLSerializer;
    }

    // Only try to require jsdom if we're in Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
        } catch {
            throw new Error('You must install the "jsdom" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.XMLSerializer;
    }

    throw new Error(
        'XMLSerializer implementation not found. In browsers, XMLSerializer should be available globally. In Node.js, you need to install the "jsdom" package.'
    );
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
    if (typeof globalThis.DOMParser !== 'undefined') {
        return globalThis.DOMParser;
    }

    // Only try to require jsdom if we're in Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
        } catch {
            throw new Error('You must install the "jsdom" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.DOMParser;
    }

    throw new Error(
        'DOMParser implementation not found. In browsers, DOMParser should be available globally. In Node.js, you need to install the "jsdom" package.'
    );
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
    if (typeof document !== 'undefined') {
        return document.implementation.createDocument('jabber:client', 'strophe', null);
    }

    // Only try to require jsdom if we're in Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        let JSDOM;
        try {
            JSDOM = require('jsdom').JSDOM;
        } catch {
            throw new Error('You must install the "jsdom" package to use Strophe in nodejs.');
        }
        const dom = new JSDOM('');
        return dom.window.document.implementation.createDocument('jabber:client', 'strophe', null);
    }

    throw new Error(
        'Could not create XML document. In browsers, document should be available globally. In Node.js, you need to install the "jsdom" package.'
    );
}
