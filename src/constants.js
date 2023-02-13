/** Constants: XMPP Namespace Constants
 *  Common namespace constants from the XMPP RFCs and XEPs.
 *
 *  Strophe.NS.HTTPBIND - HTTP BIND namespace from XEP 124.
 *  Strophe.NS.BOSH - BOSH namespace from XEP 206.
 *  Strophe.NS.CLIENT - Main XMPP client namespace.
 *  Strophe.NS.AUTH - Legacy authentication namespace.
 *  Strophe.NS.ROSTER - Roster operations namespace.
 *  Strophe.NS.PROFILE - Profile namespace.
 *  Strophe.NS.DISCO_INFO - Service discovery info namespace from XEP 30.
 *  Strophe.NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
 *  Strophe.NS.MUC - Multi-User Chat namespace from XEP 45.
 *  Strophe.NS.SASL - XMPP SASL namespace from RFC 3920.
 *  Strophe.NS.STREAM - XMPP Streams namespace from RFC 3920.
 *  Strophe.NS.BIND - XMPP Binding namespace from RFC 3920 and RFC 6120.
 *  Strophe.NS.SESSION - XMPP Session namespace from RFC 3920.
 *  Strophe.NS.XHTML_IM - XHTML-IM namespace from XEP 71.
 *  Strophe.NS.XHTML - XHTML body namespace from XEP 71.
 */
export const NS = {
    HTTPBIND: "http://jabber.org/protocol/httpbind",
    BOSH: "urn:xmpp:xbosh",
    CLIENT: "jabber:client",
    AUTH: "jabber:iq:auth",
    ROSTER: "jabber:iq:roster",
    PROFILE: "jabber:iq:profile",
    DISCO_INFO: "http://jabber.org/protocol/disco#info",
    DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
    MUC: "http://jabber.org/protocol/muc",
    SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
    STREAM: "http://etherx.jabber.org/streams",
    FRAMING: "urn:ietf:params:xml:ns:xmpp-framing",
    BIND: "urn:ietf:params:xml:ns:xmpp-bind",
    SESSION: "urn:ietf:params:xml:ns:xmpp-session",
    VERSION: "jabber:iq:version",
    STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas",
    XHTML_IM: "http://jabber.org/protocol/xhtml-im",
    XHTML: "http://www.w3.org/1999/xhtml",
}

/** Constants: XHTML_IM Namespace
 *  contains allowed tags, tag attributes, and css properties.
 *  Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
 *  See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
 *  allowed tags and their attributes.
 */
export const XHTML = {
    tags: ['a','blockquote','br','cite','em','img','li','ol','p','span','strong','ul','body'],
    attributes: {
        'a':          ['href'],
        'blockquote': ['style'],
        'br':         [],
        'cite':       ['style'],
        'em':         [],
        'img':        ['src', 'alt', 'style', 'height', 'width'],
        'li':         ['style'],
        'ol':         ['style'],
        'p':          ['style'],
        'span':       ['style'],
        'strong':     [],
        'ul':         ['style'],
        'body':       []
    },
    css: ['background-color','color','font-family','font-size','font-style','font-weight','margin-left','margin-right','text-align','text-decoration'],
}

/** Constants: Connection Status Constants
 *  Connection status constants for use by the connection handler
 *  callback.
 *
 *  Strophe.Status.ERROR - An error has occurred
 *  Strophe.Status.CONNECTING - The connection is currently being made
 *  Strophe.Status.CONNFAIL - The connection attempt failed
 *  Strophe.Status.AUTHENTICATING - The connection is authenticating
 *  Strophe.Status.AUTHFAIL - The authentication attempt failed
 *  Strophe.Status.CONNECTED - The connection has succeeded
 *  Strophe.Status.DISCONNECTED - The connection has been terminated
 *  Strophe.Status.DISCONNECTING - The connection is currently being terminated
 *  Strophe.Status.ATTACHED - The connection has been attached
 *  Strophe.Status.REDIRECT - The connection has been redirected
 *  Strophe.Status.CONNTIMEOUT - The connection has timed out
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
    ATTACHFAIL: 12
}

export const ErrorCondition = {
    BAD_FORMAT: "bad-format",
    CONFLICT: "conflict",
    MISSING_JID_NODE: "x-strophe-bad-non-anon-jid",
    NO_AUTH_MECH: "no-auth-mech",
    UNKNOWN_REASON: "unknown",
}


/** Constants: Log Level Constants
 *  Logging level indicators.
 *
 *  Strophe.LogLevel.DEBUG - Debug output
 *  Strophe.LogLevel.INFO - Informational output
 *  Strophe.LogLevel.WARN - Warnings
 *  Strophe.LogLevel.ERROR - Errors
 *  Strophe.LogLevel.FATAL - Fatal errors
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
}

/** PrivateConstants: DOM Element Type Constants
 *  DOM element types.
 *
 *  ElementType.NORMAL - Normal element.
 *  ElementType.TEXT - Text data element.
 *  ElementType.FRAGMENT - XHTML fragment element.
 */
export const ElementType = {
    NORMAL: 1,
    TEXT: 3,
    CDATA: 4,
    FRAGMENT: 11,
}


/** PrivateConstants: Timeout Values
 *  Timeout values for error states.  These values are in seconds.
 *  These should not be changed unless you know exactly what you are
 *  doing.
 *
 *  TIMEOUT - Timeout multiplier. A waiting request will be considered
 *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
 *      This defaults to 1.1, and with default wait, 66 seconds.
 *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
 *      Strophe can detect early failure, it will consider the request
 *      failed if it doesn't return after
 *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
 *      This defaults to 0.1, and with default wait, 6 seconds.
 */
export const TIMEOUT = 1.1;
export const SECONDARY_TIMEOUT = 0.1;
