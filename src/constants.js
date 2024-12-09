/**
 * Common namespace constants from the XMPP RFCs and XEPs.
 *
 * @typedef { Object } NS
 * @property {string} NS.HTTPBIND - HTTP BIND namespace from XEP 124.
 * @property {string} NS.BOSH - BOSH namespace from XEP 206.
 * @property {string} NS.CLIENT - Main XMPP client namespace.
 * @property {string} NS.AUTH - Legacy authentication namespace.
 * @property {string} NS.ROSTER - Roster operations namespace.
 * @property {string} NS.PROFILE - Profile namespace.
 * @property {string} NS.DISCO_INFO - Service discovery info namespace from XEP 30.
 * @property {string} NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
 * @property {string} NS.MUC - Multi-User Chat namespace from XEP 45.
 * @property {string} NS.SASL - XMPP SASL namespace from RFC 3920.
 * @property {string} NS.STREAM - XMPP Streams namespace from RFC 3920.
 * @property {string} NS.BIND - XMPP Binding namespace from RFC 3920 and RFC 6120.
 * @property {string} NS.SESSION - XMPP Session namespace from RFC 3920.
 * @property {string} NS.XHTML_IM - XHTML-IM namespace from XEP 71.
 * @property {string} NS.XHTML - XHTML body namespace from XEP 71.
 * @property {string} NS.STANZAS
 * @property {string} NS.FRAMING
 */
export const NS = {
    HTTPBIND: 'http://jabber.org/protocol/httpbind',
    BOSH: 'urn:xmpp:xbosh',
    CLIENT: 'jabber:client',
    SERVER: 'jabber:server',
    AUTH: 'jabber:iq:auth',
    ROSTER: 'jabber:iq:roster',
    PROFILE: 'jabber:iq:profile',
    DISCO_INFO: 'http://jabber.org/protocol/disco#info',
    DISCO_ITEMS: 'http://jabber.org/protocol/disco#items',
    MUC: 'http://jabber.org/protocol/muc',
    SASL: 'urn:ietf:params:xml:ns:xmpp-sasl',
    STREAM: 'http://etherx.jabber.org/streams',
    FRAMING: 'urn:ietf:params:xml:ns:xmpp-framing',
    BIND: 'urn:ietf:params:xml:ns:xmpp-bind',
    SESSION: 'urn:ietf:params:xml:ns:xmpp-session',
    VERSION: 'jabber:iq:version',
    STANZAS: 'urn:ietf:params:xml:ns:xmpp-stanzas',
    XHTML_IM: 'http://jabber.org/protocol/xhtml-im',
    XHTML: 'http://www.w3.org/1999/xhtml',
};

export const PARSE_ERROR_NS = 'http://www.w3.org/1999/xhtml';

/**
 * Contains allowed tags, tag attributes, and css properties.
 * Used in the {@link Strophe.createHtml} function to filter incoming html into the allowed XHTML-IM subset.
 * See [XEP-0071](http://xmpp.org/extensions/xep-0071.html#profile-summary) for the list of recommended
 * allowed tags and their attributes.
 */
export const XHTML = {
    tags: ['a', 'blockquote', 'br', 'cite', 'em', 'img', 'li', 'ol', 'p', 'span', 'strong', 'ul', 'body'],
    attributes: {
        'a': ['href'],
        'blockquote': ['style'],
        /** @type {never[]} */
        'br': [],
        'cite': ['style'],
        /** @type {never[]} */
        'em': [],
        'img': ['src', 'alt', 'style', 'height', 'width'],
        'li': ['style'],
        'ol': ['style'],
        'p': ['style'],
        'span': ['style'],
        /** @type {never[]} */
        'strong': [],
        'ul': ['style'],
        /** @type {never[]} */
        'body': [],
    },
    css: [
        'background-color',
        'color',
        'font-family',
        'font-size',
        'font-style',
        'font-weight',
        'margin-left',
        'margin-right',
        'text-align',
        'text-decoration',
    ],
};

/** @typedef {number} connstatus */

/**
 * Connection status constants for use by the connection handler
 * callback.
 *
 * @typedef {Object} Status
 * @property {connstatus} Status.ERROR - An error has occurred
 * @property {connstatus} Status.CONNECTING - The connection is currently being made
 * @property {connstatus} Status.CONNFAIL - The connection attempt failed
 * @property {connstatus} Status.AUTHENTICATING - The connection is authenticating
 * @property {connstatus} Status.AUTHFAIL - The authentication attempt failed
 * @property {connstatus} Status.CONNECTED - The connection has succeeded
 * @property {connstatus} Status.DISCONNECTED - The connection has been terminated
 * @property {connstatus} Status.DISCONNECTING - The connection is currently being terminated
 * @property {connstatus} Status.ATTACHED - The connection has been attached
 * @property {connstatus} Status.REDIRECT - The connection has been redirected
 * @property {connstatus} Status.CONNTIMEOUT - The connection has timed out
 * @property {connstatus} Status.BINDREQUIRED - The JID resource needs to be bound for this session
 * @property {connstatus} Status.ATTACHFAIL - Failed to attach to a pre-existing session
 * @property {connstatus} Status.RECONNECTING - Not used by Strophe, but added for integrators
 */
export const Status = {
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
    ATTACHFAIL: 12,
    RECONNECTING: 13,
};

export const ErrorCondition = {
    BAD_FORMAT: 'bad-format',
    CONFLICT: 'conflict',
    MISSING_JID_NODE: 'x-strophe-bad-non-anon-jid',
    NO_AUTH_MECH: 'no-auth-mech',
    UNKNOWN_REASON: 'unknown',
};

/**
 * Logging level indicators.
 * @typedef {0|1|2|3|4} LogLevel
 * @typedef {'DEBUG'|'INFO'|'WARN'|'ERROR'|'FATAL'} LogLevelName
 * @typedef {Record<LogLevelName, LogLevel>} LogLevels
 */
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
};

/**
 * DOM element types.
 *
 * - ElementType.NORMAL - Normal element.
 * - ElementType.TEXT - Text data element.
 * - ElementType.FRAGMENT - XHTML fragment element.
 */
export const ElementType = {
    NORMAL: 1,
    TEXT: 3,
    CDATA: 4,
    FRAGMENT: 11,
};
