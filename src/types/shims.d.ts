/**
 * Creates a dummy XML DOM document to serve as an element and text node generator.
 *
 * Used implementations:
 *  - browser: use document's createDocument
 * - nodejs: use 'jsdom' https://www.npmjs.com/package/jsdom
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
export const XMLSerializer: {
    new (): XMLSerializer;
    prototype: XMLSerializer;
};
export const DOMParser: {
    new (): DOMParser;
    prototype: DOMParser;
};
//# sourceMappingURL=shims.d.ts.map