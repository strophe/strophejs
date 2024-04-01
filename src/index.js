/*global globalThis*/

import * as shims from './shims.js';
import * as utils from './utils.js';
import Bosh from './bosh.js';
import Builder, { $build, $msg, $pres, $iq } from './builder.js';
import Connection from './connection.js';
import Handler from './handler.js';
import Request from './request.js';
import SASLAnonymous from './sasl-anon.js';
import SASLExternal from './sasl-external.js';
import SASLMechanism from './sasl.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import TimedHandler from './timed-handler.js';
import Websocket from './websocket.js';
import WorkerWebsocket from './worker-websocket.js';
import log from './log.js';
import { ElementType, ErrorCondition, LOG_LEVELS, NS, Status, XHTML } from './constants.js';
import { stx, toStanza, Stanza } from './stanza.js';

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
const Strophe = {
    /** @constant: VERSION */
    VERSION: '3.0.0',

    /**
     * @returns {number}
     */
    get TIMEOUT() {
        return Bosh.getTimeoutMultplier();
    },

    /**
     * @param {number} n
     */
    set TIMEOUT(n) {
        Bosh.setTimeoutMultiplier(n);
    },

    /**
     * @returns {number}
     */
    get SECONDARY_TIMEOUT() {
        return Bosh.getSecondaryTimeoutMultplier();
    },

    /**
     * @param {number} n
     */
    set SECONDARY_TIMEOUT(n) {
        Bosh.setSecondaryTimeoutMultiplier(n);
    },

    ...utils,
    ...log,

    shims,

    Request,

    // Transports
    Bosh,
    Websocket,
    WorkerWebsocket,
    Connection,
    Handler,

    // Available authentication mechanisms
    SASLAnonymous,
    SASLPlain,
    SASLSHA1,
    SASLSHA256,
    SASLSHA384,
    SASLSHA512,
    SASLOAuthBearer,
    SASLExternal,
    SASLXOAuth2,

    Builder,
    ElementType,
    ErrorCondition,
    LogLevel: LOG_LEVELS,
    /** @type {Object.<string, string>} */
    NS,
    SASLMechanism,
    /** @type {Status} */
    Status,
    TimedHandler,

    XHTML: {
        ...XHTML,
        validTag: utils.validTag,
        validCSS: utils.validCSS,
        validAttribute: utils.validAttribute,
    },

    /**
     * Render a DOM element and all descendants to a String.
     * @method Strophe.serialize
     * @param {Element|Builder} elem - A DOM element.
     * @return {string} - The serialized element tree as a String.
     */
    serialize(elem) {
        return Builder.serialize(elem)
    },

    /**
     * @typedef {import('./constants').LogLevel} LogLevel
     *
     * Library consumers can use this function to set the log level of Strophe.
     * The default log level is Strophe.LogLevel.INFO.
     * @param {LogLevel} level
     * @example Strophe.setLogLevel(Strophe.LogLevel.DEBUG);
     */
    setLogLevel(level) {
        log.setLogLevel(level);
    },

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
    addNamespace(name, value) {
        Strophe.NS[name] = value;
    },

    /**
     * Extends the Strophe.Connection object with the given plugin.
     * @param {string} name - The name of the extension.
     * @param {Object} ptype - The plugin's prototype.
     */
    addConnectionPlugin(name, ptype) {
        Connection.addConnectionPlugin(name, ptype);
    },
};

globalThis.$build = $build;
globalThis.$iq = $iq;
globalThis.$msg = $msg;
globalThis.$pres = $pres;
globalThis.Strophe = Strophe;

export { Builder, $build, $iq, $msg, $pres, Strophe, Stanza, stx, toStanza, Request };
