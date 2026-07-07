/**
 * XEP-0198 Stream Management
 *
 * The page-side state mirror for worker mode.
 *
 * Page-only: never imported by the shared-connection-worker bundle.
 */
import { freshState } from './utils';
import { SMState, StanzaView, StreamManagementController } from './types';

/**
 * A page-side stand-in for the worker-resident engine: when the connection
 * runs through a SharedWorker, the worker owns all counting, queueing and
 * nonza handling, and the page only mirrors the session state so that
 * `Connection.hasResumed()` and friends keep working.
 */
export class StreamManagementMirror implements StreamManagementController {
    serverSupported = false;
    private _state: SMState = freshState();

    /* Read surface. Reflects the worker-owned session state. */

    get state(): SMState {
        return this._state;
    }

    get enabled(): boolean {
        return this._state.enabled;
    }

    get resumed(): boolean {
        return this._state.resumed;
    }

    get boundJid(): string {
        return this._state.boundJid;
    }

    get resumePending(): boolean {
        // The worker owns resumption; the page never has a <resume/> in flight.
        return false;
    }

    /* Inert active surface. The worker owns all counting/queueing/nonzas. */

    initialize(_jid: string): void {
        return;
    }

    hasResumableState(): boolean {
        return false;
    }

    reset(): void {
        this._state = freshState();
        this.serverSupported = false;
    }

    sendResume(): void {
        return;
    }

    sendEnable(_boundJid: string): void {
        return;
    }

    isTracking(): boolean {
        return false;
    }

    trackOutbound(_view: StanzaView): void {
        return;
    }

    onInbound(_view: StanzaView): void {
        return;
    }

    onInboundStanza(_name: string): void {
        return;
    }

    onGracefulClose(): void {
        return;
    }

    /* Overridable event hooks (a shim overrides these to re-emit on its bus). */

    onEnabled(): void {
        return;
    }

    onResumed(): void {
        return;
    }

    onFailed(_view?: StanzaView, _resumeFailed?: boolean): void {
        return;
    }

    /* Mirror updates, driven by the worker's lifecycle messages. */

    /**
     * @param id - The SM-ID of the fresh session.
     * @param max - The server's preferred maximum resumption time.
     * @param boundJid - The JID that was bound when the session was enabled.
     */
    _onEnabled(id: string, max: number, boundJid: string): void {
        const s = this._state;
        s.enabled = true;
        s.id = id;
        s.max = max;
        s.boundJid = boundJid;
        this.onEnabled();
    }

    /**
     * @param boundJid - The worker's boundJid for the resumed session.
     * @param id - The SM-ID of the resumed session.
     * @param max - The server's preferred maximum resumption time.
     */
    _onResumed(boundJid: string, id?: string, max?: number): void {
        const s = this._state;
        s.resumed = true;
        s.enabled = true;
        s.boundJid = boundJid;
        // Repopulate id/max too: the tab that drove the reconnect reset its
        // mirror when the reconnect started, and _onResumed is the only SM
        // message it receives.
        if (id !== undefined) s.id = id;
        if (max !== undefined) s.max = max;
        this.onResumed();
    }

    _onFailed(): void {
        this._state = freshState();
        // _smFailed is only broadcast for a failed *resumption* (a refused
        // <enable/> stays inside the worker), so resumeFailed is always true.
        this.onFailed(undefined, true);
    }
}
