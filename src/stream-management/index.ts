/**
 * XEP-0198 Stream Management.
 *
 * One engine, two hosts: the environment-free {@link StreamManagement} core
 * (engine.ts) is owned by the page-side Connection for plain websocket
 * connections, or by the shared connection worker when the `worker` option
 * is set, in which case the page holds only a {@link StreamManagementMirror}.
 * The engine consumes {@link StanzaView}s produced by a thin per-environment
 * adapter: dom.ts (Element → view, page) or parse.ts (frame string → view,
 * worker).
 *
 * The worker bundle (dist/shared-connection-worker.js) imports engine.ts and
 * parse.ts directly so the page-only modules (dom.ts, mirror.ts) stay out of
 * it by construction.
 */
export { default } from './engine';
export { MemoryStorageBackend, SessionStorageBackend } from './storage';
export { StreamManagementMirror } from './mirror';
export { isCountableStanza, stampDelay } from './utils';
export { toStanzaView } from './dom';
export { peekElement } from './parse';
export type {
    StanzaView,
    QueuedStanza,
    SMState,
    SMStorageBackend,
    StreamManagementController,
    StreamManagementOptions,
} from './types';
