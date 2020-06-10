/*
 * This module provides uniform
 * Shims APIs and globals that are not present in all JS environments,
 * the most common example for Strophe being browser APIs like WebSocket
 * and DOM that don't exist under nodejs.
 *
 * Usually these will be supplied in nodejs by conditionally requiring a
 * NPM module that provides a compatible implementation.
 */

/* global global, globalThis, SharedWorkerGlobalScope */
import xmldom from 'xmldom';


function getEnv () {
    if (globalThis.toString() === "[object Window]") {
        return 'Window';
    } else if (globalThis.toString() === "[object SharedWorkerGlobalScope]") {
        return 'Worker';
    } else {
        return 'Node';
    }
}


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
    const env = getEnv();
    if (env === 'Window' || env === 'Worker') {
        return globalThis.Websocket;
    } else {
        try {
            return require('ws');
        } catch (err) {
            throw new Error('You must install the "ws" package to use Strophe in nodejs.');
        }
    }
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
 * - nodejs: use 'xmldom' module
 *   https://www.npmjs.com/package/xmldom
 */
function getDOMParserImplementation () {
    const env = getEnv();
    if (env === 'Window') {
        return globalThis.DOMParser;
    } else if (env === 'Worker') {
        return xmldom.DOMParser;
    } else {
        try {
            return require('xmldom').DOMParser;
        } catch (err) {
            throw new Error('You must install the "xmldom" package to use Strophe in nodejs.');
        }
    }
}
export const DOMParser = getDOMParserImplementation()

/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - IE < 10: avoid using createDocument() due to a memory leak, use ie-specific
 *    workaround
 *  - other supported browsers: use document's createDocument
 *  - nodejs: use 'xmldom'
 */
export function getDummyXMLDOMDocument () {
    const env = getEnv();
    if (env === 'Window') {
        return document.implementation.createDocument('jabber:client', 'strophe', null)
    } else if (env === 'Worker') {
        return new xmldom.DOMImplementation().createDocument('jabber:client', 'strophe', null);
    } else {
        try {
            const DOMImplementation = require('xmldom').DOMImplementation;
            return new DOMImplementation().createDocument('jabber:client', 'strophe', null);
        } catch (err) {
            throw new Error('You must install the "xmldom" package to use Strophe in nodejs.');
        }
    }
}

