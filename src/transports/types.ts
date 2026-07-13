import type Connection from '../connection';
import type Builder from '../builder';

export interface WebsocketLike {
    send(str: string): void;
    close(): void;
    onopen: (() => void) | null;
    onerror: ((e: Event) => void) | null;
    onclose: ((e: CloseEvent) => void) | null;
    onmessage: ((message: MessageEvent) => void) | null;
    readyState: number | null;
}

/**
 * The contract every transport (BOSH, WebSocket, the shared-worker WebSocket,
 * the XEP-0114 component transport, and any transport registered via
 * {@link Connection.addProtocol}) must fulfil for {@link Connection} to drive
 * it.
 *
 * These members carry a leading underscore for historical reasons: the codebase
 * predates `#` private fields and marks internals with `_`. Despite the naming
 * they are not private, they are the cross-class API that `Connection` invokes
 * on `this._proto`. Transport-specific extras (BOSH's `_attach`/`_restore`, the
 * worker's Stream Management callbacks, and so on) are deliberately kept off
 * this interface; `Connection` reaches those through `instanceof` narrowing.
 */
export interface Transport {
    /** The Connection that owns this transport. */
    _conn: Connection;
    /**
     * The wrapper element name whose children `Connection` unwraps before
     * dispatch. BOSH overloads it as a boolean toggle, hence the union.
     */
    strip: string | boolean;
    /** Reset all transport state (see {@link Connection.reset}). */
    _reset(): void;
    /**
     * Open the transport. The `wait`/`hold`/`route` arguments are meaningful
     * only to BOSH; the streaming transports ignore them.
     */
    _connect(wait?: number, hold?: number, route?: string): void;
    /** Inspect the opening stream/body and optionally return a status. */
    _connect_cb(bodyWrap: Element): number | void;
    /** Send an optional final stanza and begin closing the stream. */
    _disconnect(pres?: Element | Builder | null): void;
    /** Tear the transport down without any further stream traffic. */
    _doDisconnect(): void;
    /** Abort any in-flight requests (a no-op for the streaming transports). */
    _abortAllRequests(): void;
    /** Flush the send queue. */
    _send(): void;
    /** Restart the stream (a no-op where the concept does not apply). */
    _sendRestart(): void;
    /** Serialize and write any queued stanzas. */
    _onIdle(): void;
    /** Handle a non-graceful disconnect timeout. */
    _onDisconnectTimeout(): void;
    /** Whether the outgoing queue is empty. */
    _emptyQueue(): boolean;
    /** Handle a stream that offered no usable authentication mechanism. */
    _no_auth_received(callback?: () => void): void;
}
