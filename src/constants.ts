/**
 * Common namespace constants from the XMPP RFCs and XEPs.
 */
export const NS = {
    AUTH: 'jabber:iq:auth',
    BIND: 'urn:ietf:params:xml:ns:xmpp-bind',
    BOSH: 'urn:xmpp:xbosh',
    CLIENT: 'jabber:client',
    DISCO_INFO: 'http://jabber.org/protocol/disco#info',
    DISCO_ITEMS: 'http://jabber.org/protocol/disco#items',
    DELAY: 'urn:xmpp:delay' /** XEP-0203 */,
    FRAMING: 'urn:ietf:params:xml:ns:xmpp-framing',
    HTTPBIND: 'http://jabber.org/protocol/httpbind',
    MUC: 'http://jabber.org/protocol/muc',
    PROFILE: 'jabber:iq:profile',
    ROSTER: 'jabber:iq:roster',
    SASL: 'urn:ietf:params:xml:ns:xmpp-sasl',
    SERVER: 'jabber:server',
    SESSION: 'urn:ietf:params:xml:ns:xmpp-session',
    SM: 'urn:xmpp:sm:3',
    STANZAS: 'urn:ietf:params:xml:ns:xmpp-stanzas',
    STREAM: 'http://etherx.jabber.org/streams',
    VERSION: 'jabber:iq:version',
    XHTML: 'http://www.w3.org/1999/xhtml',
    XHTML_IM: 'http://jabber.org/protocol/xhtml-im',
} as const;

export const PARSE_ERROR_NS = 'http://www.w3.org/1999/xhtml';

/**
 * The version of the page↔worker message protocol spoken between
 * WorkerWebsocket and dist/shared-connection-worker.js. A SharedWorker can
 * outlive the pages that spawned it, so after a deploy a freshly loaded page
 * may attach to a worker from an older build (or vice versa). The version is
 * exchanged on _connect/_attach so that a mismatch fails loudly instead of
 * silently misbehaving.
 */
export const SHARED_WORKER_PROTOCOL_VERSION = 1;

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
        'br': [] as never[],
        'cite': ['style'],
        'em': [] as never[],
        'img': ['src', 'alt', 'style', 'height', 'width'],
        'li': ['style'],
        'ol': ['style'],
        'p': ['style'],
        'span': ['style'],
        'strong': [] as never[],
        'ul': ['style'],
        'body': [] as never[],
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

export type ConnStatus = number;

/**
 * Connection status constants for use by the connection handler
 * callback.
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
} as const;

export const ErrorCondition = {
    BAD_FORMAT: 'bad-format',
    CONFLICT: 'conflict',
    MISSING_JID_NODE: 'x-strophe-bad-non-anon-jid',
    NO_AUTH_MECH: 'no-auth-mech',
    UNKNOWN_REASON: 'unknown',
} as const;

/**
 * Logging level indicators.
 */
export type LogLevel = 0 | 1 | 2 | 3 | 4;
export type LogLevelName = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogLevels = Record<LogLevelName, LogLevel>;

export const LOG_LEVELS: LogLevels = {
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
} as const;
