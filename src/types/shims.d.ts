/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - IE < 10: avoid using createDocument() due to a memory leak, use ie-specific
 *    workaround
 *  - other supported browsers: use document's createDocument
 *  - nodejs: use '@xmldom/xmldom'
 */
export function getDummyXMLDOMDocument(): XMLDocument;
export const WebSocket: {
    new (url: string | URL, protocols?: string | string[]): WebSocket;
    prototype: WebSocket;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
} | typeof import("ws");
export const DOMParser: {
    new (): DOMParser;
    prototype: DOMParser;
};
//# sourceMappingURL=shims.d.ts.map