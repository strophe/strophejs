/**
 * XEP-0198 Stream Management
 *
 * Everything in this module is environment-free (no DOM, no worker globals)
 * so it can be imported from both the page bundle and the standalone
 * shared-connection-worker bundle.
 */

/**
 * A minimal, environment-free view of a top-level stanza or nonza.
 *
 * The page adapter builds it from a DOM Element (see dom.ts), the worker
 * adapter from a raw frame string (see parse.ts).
 */
export interface StanzaView {
    name: string; /** The local (unprefixed) tag name of the top-level element. */
    attrs: Record<string, string>; /** The attributes of the top-level element. */
    serialized: string; /** The serialized element used as the unacked queue payload. */
}

/** An entry in the unacked queue. */
export interface QueuedStanza {
    name: string; /** The local tag name (needed to decide XEP-0203 delay-stamping on re-send). */
    stanza: string; /** The serialized stanza. */
    queuedAt: number; /** When the stanza was first queued (ms since epoch) the XEP-0203 delay stamp value. */
}

/** The serialisable Stream Management session state. */
export interface SMState {
    /**
     * Whether <enable/> has been sent on the current stream. The XEP starts the
     * two counters asymmetrically: outbound tracking begins at enable-*send*,
     * inbound counting at <enabled/>-*receipt* (XEP-0198 §4, note).
     */
    enableSent: boolean;
    enabled: boolean; /** Whether <enabled/> has been received; inbound counting is active. */
    id: string; /** The SM-ID from <enabled/>; sent as `previd` when resuming. */
    boundJid: string; /** The full JID that was bound when <enable/> was sent (re-applied resume). */
    max: number; /** Server's preferred max resumption time in seconds (from <enabled/>). */
    location: string; /** Server's preferred reconnection location (from <enabled/>). Stored but not acted upon. */
    resumeSupported: boolean; /** Whether the server allows this session to be resumed. */
    resumed: boolean; /** Whether the current session was established by resuming a previous one. */
    hIn: number; /** Count of inbound stanzas handled by us. The client's 'h', mod 2^32. */
    hOutAcked: number; /** The last 'h' value acknowledged by the server. */
    unacked: QueuedStanza[]; /** Outbound stanzas sent but not yet acknowledged by the server. */
    sinceLastAck: number; /** Outbound countable stanzas since the server's last <a/>. */
}

/**
 * Pluggable persistence for resumable SM state.
 * Implementations must be synchronous. The <resumed/> handler runs inside the
 * synchronous stanza dispatch and state must be consistent immediately after.
 */
export interface SMStorageBackend {
    load(key: string): SMState | null;
    save(key: string, state: SMState): void;
    clear(key: string): void;
}

export interface StreamManagementOptions {
    maxUnacked?: number; /** Request an ack via <r/> after this many outbound stanzas. 0 disables. Default: 5. */
    requestResume?: boolean; /** Ask for a resumable session (resume="true" on <enable/>). Default: true. */
    max?: number; /** The client's preferred max resumption time in seconds (max attribute on <enable/>). */
    storage?: SMStorageBackend; /** Storage backend for resumable state. Default: per-instance MemoryStorageBackend. */
}

/**
 * The Stream Management surface a page-side Connection depends on, implemented
 * by both the worker-free engine (engine.ts) and the worker-mode page mirror
 * (mirror.ts). Typing `Connection.sm` against this (rather than the concrete
 * engine class) is what lets the mirror be a peer implementation instead of a
 * subclass full of neutralised overrides: any member added here must be
 * implemented by both sides, so the mirror can never silently inherit a live
 * engine method it was meant to render inert.
 */
export interface StreamManagementController {
    /** Whether the current stream's features advertised <sm xmlns="urn:xmpp:sm:3"/>. */
    serverSupported: boolean;
    /** The live SM session state (fields are mutable; the reference is not reassigned). */
    readonly state: SMState;
    /** Whether <enabled/> has been received and the session is active. */
    readonly enabled: boolean;
    /** Whether the current session was established by resumption. */
    readonly resumed: boolean;
    /** The full JID bound when the session was enabled. */
    readonly boundJid: string;
    /** Whether a <resume/> has been sent and not yet answered. */
    readonly resumePending: boolean;

    /** Load persisted resumable state for the given (bare) JID. */
    initialize(jid: string): void;
    /** Whether persisted state allows attempting <resume/>. */
    hasResumableState(): boolean;
    /** Reset the in-memory session state. */
    reset(): void;
    /** Send <resume/> for the persisted previous session. */
    sendResume(): void;
    /** Send <enable/> to start a new session. */
    sendEnable(boundJid: string): void;
    /** Whether outbound stanzas are currently being tracked (i.e. <enable/> was sent). */
    isTracking(): boolean;
    /** Track an outbound top-level element. */
    trackOutbound(view: StanzaView): void;
    /** Process an inbound top-level element (count a stanza or handle a nonza). */
    onInbound(view: StanzaView): void;
    /** Count an inbound top-level stanza by name. */
    onInboundStanza(name: string): void;
    /** End the session cleanly: final <a/> and clear persisted state. */
    onGracefulClose(): void;

    /** Overridable event hook: a session was established via <enabled/>. */
    onEnabled(): void;
    /** Overridable event hook: the previous session was resumed via <resumed/>. */
    onResumed(): void;
    /** Overridable event hook: <enable/> or <resume/> failed. */
    onFailed(view?: StanzaView, resumeFailed?: boolean): void;
}
