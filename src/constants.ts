/**
 * Common namespace constants from the XMPP RFCs and XEPs.
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
} as const;

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
