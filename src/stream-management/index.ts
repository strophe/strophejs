/**
 * XEP-0198 Stream Management.
 *
 * The environment-free {@link StreamManagement} engine (engine.ts) holds all
 * SM state and logic; it consumes minimal {@link StanzaView}s produced by a
 * thin adapter on whichever side hosts it, so the same implementation can run
 * on a page or inside a SharedWorker.
 */
export { default } from './engine';
export { MemoryStorageBackend, SessionStorageBackend } from './storage';
export { isCountableStanza, stampDelay } from './utils';
export { toStanzaView } from './dom';
export type { StanzaView, QueuedStanza, SMState, SMStorageBackend, StreamManagementOptions } from './types';
