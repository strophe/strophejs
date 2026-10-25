/**
 * Node.js DOM shim.
 *
 * Browsers provide `DOMParser`, `XMLSerializer` and a `document` natively;
 * Node.js does not. The Node build therefore wires up `@xmldom/xmldom`, a
 * small, pure-JS, XML-only W3C DOM, together with the `ws` WebSocket.
 *
 * It is imported for its side effects by the Node entry point (see
 * `index-node.ts`) before any Connection is created, and is never part of the
 * browser build.
 *
 * Thin compatibility shims bridge the gaps between `@xmldom/xmldom` and the
 * browser DOM that Strophe's shared code assumes:
 *
 *  - `firstElementChild` and `adoptNode`: `@xmldom/xmldom` implements neither,
 *    so both are polyfilled onto its prototypes.
 *  - parse errors: browsers return a document whose root is a `<parsererror>`
 *    element for malformed input, whereas `@xmldom/xmldom` throws. `DOMParser`
 *    is wrapped to restore the browser behaviour, which is what
 *    {@link getParserError} and the BOSH/WebSocket parse paths expect. The
 *    wrapper also refuses the characters XML cannot represent, which a browser
 *    rejects and `@xmldom/xmldom` passes through without a word.
 */
import ws from 'ws';
import { DOMParser as XmlDOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
import { PARSE_ERROR_NS } from '../constants';
import { findDisallowedChar } from '../xml-chars';

const domImplementation = new DOMImplementation();

globalThis.WebSocket = ws as unknown as typeof globalThis.WebSocket;
globalThis.XMLSerializer = XMLSerializer as unknown as typeof globalThis.XMLSerializer;

// `xmlGenerator()` only ever calls `document.implementation.createDocument(...)`,
// so an empty document is the entire global `document` surface Strophe needs.
globalThis.document = domImplementation.createDocument(null, null, null) as unknown as Document;

// --- strict parsing --------------------------------------------------------
/**
 * Parse as strictly as a browser does, throwing on anything a browser refuses.
 *
 * `@xmldom/xmldom` reports a character which XML cannot represent neither as a
 * `fatalError` nor as anything else: it hands the text back with the character
 * still in it. A stanza built or received under Node would then carry it to the
 * wire, and the server would answer the stream with `not-well-formed` and close
 * it. Browsers refuse such a document, and so does the `saxes` parser the
 * XEP-0114 transport uses, so this is the one place the three disagreed.
 *
 * Everything the library parses arrives here, which is why the check lives at
 * the parser rather than at each of the places a value can be interpolated: a
 * value written into an attribute, a comment, a CDATA section or at document
 * level is read by the parser like any other markup, and so is a stanza which
 * came off the wire. A value in element content is the one exception, since it
 * becomes a text node without being parsed at all; `stanza` refuses it there,
 * which is why both ask {@link findDisallowedChar} rather than one of them
 * covering the other.
 */
function parseStrictly(source: string, mimeType: string): unknown {
    const found = findDisallowedChar(source);
    if (found) {
        throw new Error(`disallowed character ${found.point} at index ${found.index}`);
    }

    const parser = new XmlDOMParser({
        onError: (level: string, message: unknown): void => {
            if (level === 'fatalError') {
                throw new Error(typeof message === 'string' ? message : String(message));
            }
        },
    });
    return (parser.parseFromString as (s: string, m: string) => unknown)(source, mimeType);
}

// --- DOM API polyfills -----------------------------------------------------
// `@xmldom/xmldom` omits a couple of browser DOM APIs that Strophe's shared code
// assumes. Add them to xmldom's Element/Document prototypes, grabbed off a
// sample tree, so the rest of the library stays browser-idiomatic.
const sample = domImplementation.createDocument(null, 'sample', null);
const elementProto = Object.getPrototypeOf(sample.documentElement);
const documentProto = Object.getPrototypeOf(sample);

// `ParentNode.firstElementChild`: the first child whose nodeType is ELEMENT_NODE.
for (const proto of [elementProto, documentProto]) {
    if (proto && !('firstElementChild' in proto)) {
        Object.defineProperty(proto, 'firstElementChild', {
            configurable: true,
            get(): Element | null {
                let node: Node | null = this.firstChild;
                while (node && node.nodeType !== 1) {
                    node = node.nextSibling;
                }
                return (node as Element) ?? null;
            },
        });
    }
}

// `Document.adoptNode`: take a node out of the document it was parsed into and
// into this one, in place. `stx` uses it to move an interpolated fragment into
// the stanza rather than deep-copying it with `importNode`, the fragment's own
// document being thrown away the moment it has been read.
//
// Attributes are left as they are. Their `ownerDocument` is not consulted by
// anything here, and walking them would cost more than the move saves.
if (documentProto && !('adoptNode' in documentProto)) {
    Object.defineProperty(documentProto, 'adoptNode', {
        configurable: true,
        value: function (node: Node): Node {
            const doc = this as Document;
            node.parentNode?.removeChild(node);

            const claim = (n: Node): void => {
                (n as { ownerDocument: Document }).ownerDocument = doc;
                for (let child = n.firstChild; child; child = child.nextSibling) claim(child);
            };
            claim(node);

            return node;
        },
    });
}

// `Element.innerHTML`: used by Builder.h() for XHTML-IM. jsdom parsed this as
// HTML; a lightweight XML DOM cannot, but XHTML-IM payloads are well-formed XML
// by definition, so parse the assigned markup as XML. Malformed input leaves the
// element empty rather than throwing (Builder.h() then produces no XHTML body).
// The getter serialises the children back, escaping text as XML.
if (elementProto && !('innerHTML' in elementProto)) {
    Object.defineProperty(elementProto, 'innerHTML', {
        configurable: true,
        get(): string {
            const serializer = new XMLSerializer();
            let out = '';
            for (let i = 0; i < this.childNodes.length; i++) {
                out += serializer.serializeToString(this.childNodes[i]);
            }
            return out;
        },
        set(html: string): void {
            while (this.firstChild) {
                this.removeChild(this.firstChild);
            }
            let root: Node | null;
            try {
                const doc = parseStrictly(`<xhtml>${html}</xhtml>`, 'text/xml') as Document;
                root = doc.documentElement as unknown as Node;
            } catch {
                return;
            }
            if (root) {
                while (root.firstChild) {
                    this.appendChild(root.firstChild);
                }
            }
        },
    });
}

// --- DOMParser parse-error compatibility -----------------------------------
// Browsers return a document rooted at a `<parsererror>` element on malformed
// XML; `@xmldom/xmldom` throws instead. Wrap it so downstream code keeps seeing
// the browser shape.
class DOMParser {
    parseFromString(source: string, mimeType: string): Document {
        try {
            return parseStrictly(source, mimeType) as Document;
        } catch (e) {
            const doc = domImplementation.createDocument(PARSE_ERROR_NS, 'parsererror', null);
            doc.documentElement?.appendChild(doc.createTextNode((e as Error).message));
            return doc as unknown as Document;
        }
    }
}

globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
