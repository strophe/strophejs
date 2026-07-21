/**
 * This file implements an incremental XML stream parser for the XEP-0114
 * external-component transport (see {@link Component} in `component.ts`).
 *
 * A raw TCP stream has no message framing: bytes arrive in arbitrary chunks and
 * a single, never-closing `<stream:stream>` root has to be parsed incrementally
 * into its top-level child stanzas. This is the SAX push parser that
 * `websocket.ts` anticipated in its "[TODO : We may actually want to use a SAX
 * Push parser]" note.
 *
 * The parser is deliberately Node-only: it relies on `node:string_decoder` to
 * reassemble multi-byte UTF-8 characters split across TCP reads and on `saxes`
 * (a small, well-tested SAX tokenizer) for tokenization.
 * The actual DOM construction reuses Strophe's own {@link xmlGenerator}, so the
 * `Element` objects handed downstream are the exact same type produced by the
 * BOSH and WebSocket transports.
 */
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { StringDecoder } from 'node:string_decoder';
import type { SaxesParser, SaxesTagNS } from 'saxes';
import { xmlGenerator } from '../utils';

/** Cached `saxes` constructor, resolved by {@link getSaxesParser} on first use. */
let SaxesParserCtor: typeof import('saxes').SaxesParser | undefined;

/**
 * Resolve the `saxes` parser constructor, loading the package on first use.
 *
 * `saxes` is an optional peer dependency needed only by this transport, so it is
 * deliberately *not* imported at module load.
 *
 * The load is synchronous because {@link Component} builds its parser in its
 * constructor.
 */
function getSaxesParser(): typeof import('saxes').SaxesParser {
    if (!SaxesParserCtor) {
        try {
            SaxesParserCtor = createRequire(import.meta.url)('saxes').SaxesParser;
        } catch {
            throw new Error(
                'Strophe: the XEP-0114 component transport requires the "saxes" package, ' +
                    'which is an optional peer dependency. Install it with `npm install saxes`.',
            );
        }
    }
    return SaxesParserCtor;
}

export interface StreamParserHandlers {
    /** Called once the opening `<stream:stream …>` header is seen, with its
     * attributes (most importantly `id`). The header never closes until the
     * stream ends, so this fires as soon as its start tag is complete. */
    onStreamStart: (attrs: Record<string, string>) => void;
    /** Called with each complete top-level stanza as a DOM {@link Element}. */
    onStanza: (stanza: Element) => void;
    /** Called when the closing `</stream:stream>` tag is received. */
    onStreamEnd: () => void;
    /** Called on any XML parse error. The stream should be considered dead. */
    onError: (error: Error) => void;
}

/**
 * Incrementally parses an XMPP component stream.
 *
 * Feed it raw socket chunks via {@link ComponentParser#write}; it emits
 * stream-start, per-stanza and stream-end events through the handlers passed to
 * the constructor. Robust to a stanza (or a single multi-byte character) being
 * split across arbitrary chunk boundaries.
 */
export default class ComponentParser {
    private readonly _handlers: StreamParserHandlers;
    private _decoder: StringDecoder;
    private _parser: SaxesParser<{ xmlns: true }>;
    /** Stack of elements currently being built (the in-progress stanza subtree).
     * Empty in between top-level stanzas. Excludes the stream root, which is
     * never materialised as an element. */
    private _stack: Element[];
    /** Whether the opening `<stream:stream>` header has been seen. */
    private _streamOpened: boolean;
    /** Set after a fatal parse error so that further writes are ignored. */
    private _errored: boolean;

    constructor(handlers: StreamParserHandlers) {
        this._handlers = handlers;
        this.reset();
    }

    /**
     * Discard all parser state and start afresh. Called when a (re)connection
     * begins so a new stream is parsed from a clean slate.
     */
    reset(): void {
        this._decoder = new StringDecoder('utf8');
        this._stack = [];
        this._streamOpened = false;
        this._errored = false;
        const SaxesParserClass = getSaxesParser();
        this._parser = new SaxesParserClass<{ xmlns: true }>({ xmlns: true });
        this._parser.on('opentag', (tag) => this._onOpenTag(tag));
        this._parser.on('closetag', () => this._onCloseTag());
        this._parser.on('text', (text) => this._onText(text));
        this._parser.on('cdata', (cdata) => this._onText(cdata));
        this._parser.on('error', (err) => this._fail(err));
    }

    /**
     * Feed a chunk of raw stream data into the parser.
     *
     * Accepts a `Buffer` (as delivered by a `node:net` socket) or an already
     * decoded string. Buffers are run through a {@link StringDecoder} so that a
     * multi-byte UTF-8 character split across two chunks is reassembled instead
     * of corrupted.
     * @param chunk - The bytes (or string) received from the socket.
     */
    write(chunk: Buffer | string): void {
        if (this._errored) {
            return;
        }
        const str = typeof chunk === 'string' ? chunk : this._decoder.write(chunk);
        if (str === '') {
            return;
        }
        try {
            this._parser.write(str);
        } catch (e) {
            this._fail(e as Error);
        }
    }

    private _fail(error: Error): void {
        if (this._errored) {
            return;
        }
        this._errored = true;
        this._handlers.onError(error);
    }

    private _onOpenTag(tag: SaxesTagNS): void {
        if (!this._streamOpened) {
            // The depth-0 element is the stream root. Capture its attributes and
            // treat it as the stream-start event; it won't close until the
            // stream ends.
            this._streamOpened = true;
            this._handlers.onStreamStart(this._flattenAttributes(tag));
            return;
        }
        const el = this._createElement(tag);
        if (this._stack.length) {
            this._stack[this._stack.length - 1].appendChild(el);
        }
        this._stack.push(el);
    }

    private _onText(text: string): void {
        // Text (and whitespace keepalives) directly under the stream root, i.e.
        // in between stanzas, is ignored.
        if (this._stack.length) {
            this._stack[this._stack.length - 1].appendChild(xmlGenerator().createTextNode(text));
        }
    }

    private _onCloseTag(): void {
        if (!this._stack.length) {
            // Nothing is being built, so this closes the stream root.
            this._streamOpened = false;
            this._handlers.onStreamEnd();
            return;
        }
        const el = this._stack.pop()!;
        if (!this._stack.length) {
            // A complete top-level stanza has been assembled.
            this._handlers.onStanza(el);
        }
    }

    private _createElement(tag: SaxesTagNS): Element {
        const el = xmlGenerator().createElementNS(tag.uri || null, tag.name);
        for (const key of Object.keys(tag.attributes)) {
            const attr = tag.attributes[key];
            // Namespace declarations are skipped: createElementNS already
            // carries the resolved URI, so re-adding xmlns/xmlns:* would only
            // duplicate them on serialisation.
            if (attr.name === 'xmlns' || attr.prefix === 'xmlns') {
                continue;
            }
            if (attr.uri) {
                el.setAttributeNS(attr.uri, attr.name, attr.value);
            } else {
                el.setAttribute(attr.name, attr.value);
            }
        }
        return el;
    }

    private _flattenAttributes(tag: SaxesTagNS): Record<string, string> {
        const attrs: Record<string, string> = {};
        for (const key of Object.keys(tag.attributes)) {
            attrs[key] = tag.attributes[key].value;
        }
        return attrs;
    }
}
