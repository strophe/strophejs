/**
 * XEP-0198 Stream Management
 *
 * Storage backends for resumable session state.
 *
 * MemoryStorageBackend is environment-free and safe in the worker bundle.
 * SessionStorageBackend requires a browser page context, but only at
 * construction time, there is no module-level DOM access here.
 */
import log from '../log';
import { SMState, SMStorageBackend } from './types';

/**
 * In-memory storage backend (Node, tests, or non-resumable setups).
 * State is serialized on save so callers can't mutate stored state by reference.
 */
export class MemoryStorageBackend implements SMStorageBackend {
    private store: Map<string, string>;

    constructor() {
        this.store = new Map();
    }

    /**
     * @param key
     */
    load(key: string): SMState {
        const stored = this.store.get(key);
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * @param key
     * @param state
     */
    save(key: string, state: SMState): void {
        this.store.set(key, JSON.stringify(state));
    }

    /**
     * @param key
     */
    clear(key: string): void {
        this.store.delete(key);
    }
}

/**
 * sessionStorage-backed storage backend (browser pages).
 * Survives page reloads within a tab, which is exactly the resumption window.
 */
export class SessionStorageBackend implements SMStorageBackend {
    constructor() {
        if (typeof sessionStorage === 'undefined') {
            throw new Error('SessionStorageBackend requires a sessionStorage global (browser page context)');
        }
    }

    /**
     * @param key
     */
    load(key: string): SMState {
        const stored = sessionStorage.getItem(key);
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            log.warn(`Discarding unparseable SM state for ${key}: ${e.message}`);
            return null;
        }
    }

    /**
     * @param key
     * @param state
     */
    save(key: string, state: SMState): void {
        sessionStorage.setItem(key, JSON.stringify(state));
    }

    /**
     * @param key
     */
    clear(key: string): void {
        sessionStorage.removeItem(key);
    }
}
