/**
 * Common namespace constants from the XMPP RFCs and XEPs.
 */
export type NS = {
    /**
     * - HTTP BIND namespace from XEP 124.
     */
    HTTPBIND: string;
    /**
     * - BOSH namespace from XEP 206.
     */
    BOSH: string;
    /**
     * - Main XMPP client namespace.
     */
    CLIENT: string;
    /**
     * - Legacy authentication namespace.
     */
    AUTH: string;
    /**
     * - Roster operations namespace.
     */
    ROSTER: string;
    /**
     * - Profile namespace.
     */
    PROFILE: string;
    /**
     * - Service discovery info namespace from XEP 30.
     */
    DISCO_INFO: string;
    /**
     * - Service discovery items namespace from XEP 30.
     */
    DISCO_ITEMS: string;
    /**
     * - Multi-User Chat namespace from XEP 45.
     */
    MUC: string;
    /**
     * - XMPP SASL namespace from RFC 3920.
     */
    SASL: string;
    /**
     * - XMPP Streams namespace from RFC 3920.
     */
    STREAM: string;
    /**
     * - XMPP Binding namespace from RFC 3920 and RFC 6120.
     */
    BIND: string;
    /**
     * - XMPP Session namespace from RFC 3920.
     */
    SESSION: string;
    /**
     * - XHTML-IM namespace from XEP 71.
     */
    XHTML_IM: string;
    /**
     * - XHTML body namespace from XEP 71.
     */
    XHTML: string;
    STANZAS: string;
    FRAMING: string;
};
export namespace NS {
    let HTTPBIND: string;
    let BOSH: string;
    let CLIENT: string;
    let AUTH: string;
    let ROSTER: string;
    let PROFILE: string;
    let DISCO_INFO: string;
    let DISCO_ITEMS: string;
    let MUC: string;
    let SASL: string;
    let STREAM: string;
    let FRAMING: string;
    let BIND: string;
    let SESSION: string;
    let VERSION: string;
    let STANZAS: string;
    let XHTML_IM: string;
    let XHTML: string;
}
export namespace XHTML {
    let tags: string[];
    namespace attributes {
        let a: string[];
        let blockquote: string[];
        let br: never[];
        let cite: string[];
        let em: never[];
        let img: string[];
        let li: string[];
        let ol: string[];
        let p: string[];
        let span: string[];
        let strong: never[];
        let ul: string[];
        let body: never[];
    }
    let css: string[];
}
/**
 * Connection status constants for use by the connection handler
 * callback.
 */
export type Status = {
    /**
     * - An error has occurred
     */
    ERROR: connstatus;
    /**
     * - The connection is currently being made
     */
    CONNECTING: connstatus;
    /**
     * - The connection attempt failed
     */
    CONNFAIL: connstatus;
    /**
     * - The connection is authenticating
     */
    AUTHENTICATING: connstatus;
    /**
     * - The authentication attempt failed
     */
    AUTHFAIL: connstatus;
    /**
     * - The connection has succeeded
     */
    CONNECTED: connstatus;
    /**
     * - The connection has been terminated
     */
    DISCONNECTED: connstatus;
    /**
     * - The connection is currently being terminated
     */
    DISCONNECTING: connstatus;
    /**
     * - The connection has been attached
     */
    ATTACHED: connstatus;
    /**
     * - The connection has been redirected
     */
    REDIRECT: connstatus;
    /**
     * - The connection has timed out
     */
    CONNTIMEOUT: connstatus;
    /**
     * - Failed to attach to a pre-existing session
     */
    ATTACHFAIL: connstatus;
    /**
     * - Not used by Strophe, but added for integrators
     */
    RECONNECTING: connstatus;
};
export namespace Status {
    let ERROR: number;
    let CONNECTING: number;
    let CONNFAIL: number;
    let AUTHENTICATING: number;
    let AUTHFAIL: number;
    let CONNECTED: number;
    let DISCONNECTED: number;
    let DISCONNECTING: number;
    let ATTACHED: number;
    let REDIRECT: number;
    let CONNTIMEOUT: number;
    let BINDREQUIRED: number;
    let ATTACHFAIL: number;
    let RECONNECTING: number;
}
export namespace ErrorCondition {
    let BAD_FORMAT: string;
    let CONFLICT: string;
    let MISSING_JID_NODE: string;
    let NO_AUTH_MECH: string;
    let UNKNOWN_REASON: string;
}
export type LogLevel = {
    DEBUG: string;
    INFO: string;
    WARN: string;
    ERROR: string;
    FATAL: string;
};
export namespace LogLevel {
    export let DEBUG: number;
    export let INFO: number;
    export let WARN: number;
    let ERROR_1: number;
    export { ERROR_1 as ERROR };
    export let FATAL: number;
}
export namespace ElementType {
    let NORMAL: number;
    let TEXT: number;
    let CDATA: number;
    let FRAGMENT: number;
}
export type connstatus = number;
//# sourceMappingURL=constants.d.ts.map