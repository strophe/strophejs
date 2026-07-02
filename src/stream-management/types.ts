/**
 * XEP-0198 Stream Management — shared types.
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
    serialized: string; /** The serialized element — used as the unacked queue payload. */
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
