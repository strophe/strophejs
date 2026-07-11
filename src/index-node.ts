/**
 * Node.js entry point for Strophe.js.
 *
 * It re-exports everything from the shared browser entry ({@link ./index}) and
 * additionally wires up the Node-only pieces that must never reach the browser
 * bundle: the DOM/WebSocket globals (see `./shims/node-dom`, which Node lacks
 * natively) and the XEP-0114 external component transport, which pulls in
 * `node:net`/`node:crypto` and the `saxes` stream tokenizer.
 *
 * The Rollup config points the Node builds (`strophe.node.esm.js`,
 * `strophe.cjs`) at this file, while the browser builds keep using `index.ts`.
 */
// Must be first: installs the DOM globals (via @xmldom/xmldom) and `ws` that the
// rest of the library assumes, before any module touches `document`/`DOMParser`.
import './shims/node-dom';
import Connection from './connection';
import Component from './transports/component';
import ComponentParser from './transports/component-parser';
import { Strophe } from './index';

// Make the component transport selectable via `{ protocol: 'component' }`.
Connection.addProtocol('component', Component);

// Expose the classes on the Strophe namespace for parity with Strophe.Websocket
// etc. (cast because the shared StropheType intentionally omits the Node-only
// transports).
(Strophe as unknown as { Component: typeof Component }).Component = Component;
(Strophe as unknown as { ComponentParser: typeof ComponentParser }).ComponentParser = ComponentParser;

export * from './index';
export { Component, ComponentParser };
export type { StreamParserHandlers } from './transports/component-parser';
