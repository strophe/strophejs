import Builder from './builder.js';
import { $build } from './builder.js';
import { $iq } from './builder.js';
import { $msg } from './builder.js';
import { $pres } from './builder.js';
/**
 * A container for all Strophe library functions.
 *
 * This object is a container for all the objects and constants
 * used in the library.  It is not meant to be instantiated, but to
 * provide a namespace for library objects, constants, and functions.
 *
 * @namespace Strophe
 * @property {Handler} Handler
 * @property {Builder} Builder
 * @property {Request} Request Represents HTTP Requests made for a BOSH connection
 * @property {Bosh} Bosh Support for XMPP-over-HTTP via XEP-0124 (BOSH)
 * @property {Websocket} Websocket Support for XMPP over websocket
 * @property {WorkerWebsocket} WorkerWebsocket Support for XMPP over websocket in a shared worker
 * @property {number} TIMEOUT=1.1 Timeout multiplier. A waiting BOSH HTTP request
 *  will be considered failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
 *  This defaults to 1.1, and with default wait, 66 seconds.
 * @property {number} SECONDARY_TIMEOUT=0.1 Secondary timeout multiplier.
 *  In cases where Strophe can detect early failure, it will consider the request
 *  failed if it doesn't return after `Math.floor(SECONDARY_TIMEOUT * wait)`
 *  seconds have elapsed. This defaults to 0.1, and with default wait, 6 seconds.
 * @property {SASLAnonymous} SASLAnonymous SASL ANONYMOUS authentication.
 * @property {SASLPlain} SASLPlain SASL PLAIN authentication
 * @property {SASLSHA1} SASLSHA1 SASL SCRAM-SHA-1 authentication
 * @property {SASLSHA256} SASLSHA256 SASL SCRAM-SHA-256 authentication
 * @property {SASLSHA384} SASLSHA384 SASL SCRAM-SHA-384 authentication
 * @property {SASLSHA512} SASLSHA512 SASL SCRAM-SHA-512 authentication
 * @property {SASLOAuthBearer} SASLOAuthBearer SASL OAuth Bearer authentication
 * @property {SASLExternal} SASLExternal SASL EXTERNAL authentication
 * @property {SASLXOAuth2} SASLXOAuth2 SASL X-OAuth2 authentication
 * @property {Status} Status
 * @property {Object.<string, string>} NS
 * @property {XHTML} XHTML
 */
export const Strophe: {
    shims: typeof shims;
    Request: typeof Request;
    Bosh: typeof Bosh;
    Websocket: typeof Websocket;
    WorkerWebsocket: typeof WorkerWebsocket;
    Connection: typeof Connection;
    Handler: typeof Handler;
    SASLAnonymous: typeof SASLAnonymous;
    SASLPlain: typeof SASLPlain;
    SASLSHA1: typeof SASLSHA1;
    SASLSHA256: typeof SASLSHA256;
    SASLSHA384: typeof SASLSHA384;
    SASLSHA512: typeof SASLSHA512;
    SASLOAuthBearer: typeof SASLOAuthBearer;
    SASLExternal: typeof SASLExternal;
    SASLXOAuth2: typeof SASLXOAuth2;
    Builder: typeof Builder;
    ElementType: {
        NORMAL: number;
        TEXT: number;
        CDATA: number;
        FRAGMENT: number;
    };
    ErrorCondition: {
        BAD_FORMAT: string;
        CONFLICT: string;
        MISSING_JID_NODE: string;
        NO_AUTH_MECH: string;
        UNKNOWN_REASON: string;
    };
    LogLevel: {
        DEBUG: number;
        INFO: number;
        WARN: number;
        ERROR: number;
        FATAL: number;
    };
    /** @type {Object.<string, string>} */
    NS: {
        [x: string]: string;
    };
    SASLMechanism: typeof SASLMechanism;
    /** @type {Status} */
    Status: Status;
    TimedHandler: typeof TimedHandler;
    XHTML: {
        validTag: typeof utils.validTag;
        validCSS: typeof utils.validCSS;
        validAttribute: typeof utils.validAttribute;
        tags: string[];
        attributes: {
            a: string[];
            blockquote: string[];
            br: never[];
            cite: string[];
            em: never[];
            img: string[];
            li: string[];
            ol: string[];
            p: string[];
            span: string[];
            strong: never[];
            ul: string[];
            body: never[];
        };
        css: string[];
    };
    /**
     * Render a DOM element and all descendants to a String.
     * @method Strophe.serialize
     * @param {Element|Builder} elem - A DOM element.
     * @return {string} - The serialized element tree as a String.
     */
    serialize(elem: Element | Builder): string;
    /**
     * @typedef {import('./constants').LogLevel} LogLevel
     *
     * Library consumers can use this function to set the log level of Strophe.
     * The default log level is Strophe.LogLevel.INFO.
     * @param {LogLevel} level
     * @example Strophe.setLogLevel(Strophe.LogLevel.DEBUG);
     */
    setLogLevel(level: import("./constants.js").LogLevel): void;
    /**
     * This function is used to extend the current namespaces in
     * Strophe.NS. It takes a key and a value with the key being the
     * name of the new namespace, with its actual value.
     * @example: Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     * @param {string} name - The name under which the namespace will be
     *     referenced under Strophe.NS
     * @param {string} value - The actual namespace.
     */
    addNamespace(name: string, value: string): void;
    /**
     * Extends the Strophe.Connection object with the given plugin.
     * @param {string} name - The name of the extension.
     * @param {Object} ptype - The plugin's prototype.
     */
    addConnectionPlugin(name: string, ptype: Object): void;
    log(level: number, msg: string): void;
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    fatal(msg: string): void;
    handleError(e: Error): void;
    utf16to8(str: string): string;
    xorArrayBuffers(x: ArrayBufferLike, y: ArrayBufferLike): ArrayBufferLike;
    arrayBufToBase64(buffer: ArrayBufferLike): string;
    base64ToArrayBuf(str: string): ArrayBufferLike;
    stringToArrayBuf(str: string): ArrayBufferLike;
    addCookies(cookies: {
        [x: string]: string;
    } | {
        [x: string]: {
            [x: string]: string;
        };
    }): void;
    xmlGenerator(): Document;
    xmlTextNode(text: string): Text;
    xmlHtmlNode(html: string): XMLDocument;
    xmlElement(name: string, attrs?: Array<Array<string>> | {
        [x: string]: string | number;
    } | string | number, text?: string | number): Element;
    validTag(tag: string): boolean;
    validAttribute(tag: string, attribute: string): boolean;
    validCSS(style: string): boolean;
    createHtml(node: Node): Node;
    copyElement(node: Node): Element | Text;
    xmlescape(text: string): string;
    xmlunescape(text: string): string;
    forEachChild(elem: Element, elemName: string, func: Function): void;
    isTagEqual(el: Element, name: string): boolean;
    getText(elem: Element): string;
    escapeNode(node: string): string;
    unescapeNode(node: string): string;
    getNodeFromJid(jid: string): string;
    getDomainFromJid(jid: string): string;
    getResourceFromJid(jid: string): string;
    getBareJidFromJid(jid: string): string;
    default: {
        utf16to8: typeof utils.utf16to8;
        xorArrayBuffers: typeof utils.xorArrayBuffers;
        arrayBufToBase64: typeof utils.arrayBufToBase64;
        base64ToArrayBuf: typeof utils.base64ToArrayBuf;
        stringToArrayBuf: typeof utils.stringToArrayBuf;
        addCookies: typeof utils.addCookies;
    };
    /** @constant: VERSION */
    VERSION: string;
    /**
     * @returns {number}
     */
    TIMEOUT: number;
    /**
     * @returns {number}
     */
    SECONDARY_TIMEOUT: number;
};
import { Stanza } from './stanza.js';
import { stx } from './stanza.js';
import { toStanza } from './stanza.js';
import Request from './request.js';
import * as shims from './shims.js';
import Bosh from './bosh.js';
import Websocket from './websocket.js';
import WorkerWebsocket from './worker-websocket.js';
import Connection from './connection.js';
import Handler from './handler.js';
import SASLAnonymous from './sasl-anon.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLExternal from './sasl-external.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import SASLMechanism from './sasl.js';
import { Status } from './constants.js';
import TimedHandler from './timed-handler.js';
import * as utils from './utils.js';
export { Builder, $build, $iq, $msg, $pres, Stanza, stx, toStanza, Request };
//# sourceMappingURL=index.d.ts.map