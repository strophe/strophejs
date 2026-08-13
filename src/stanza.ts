import Builder from './builder';
import { ElementType } from './constants';
import { checkNamespace } from './namespace';
import { xmlText } from './xml-chars';
import { strip } from './whitespace';
import { getFirstElementChild, getParserError, stripWhitespace, xmlHtmlNode, xmlescape } from './utils';

export class UnsafeXML extends String {}

export type StanzaValue = string | Stanza | Builder | UnsafeXML | StanzaValue[];

/**
 * The whitespace in an `stx` template has two origins which mean opposite
 * things. The static parts of the template are markup, so the line breaks and
 * indentation between their tags are formatting and is stripped. Text
 * interpolated with `${}` is considered content and its whitespace is kept.
 *
 * Interpolated values are therefore never written into the text which is
 * parsed. Instead, a processing instruction stands in for it, and is replaced
 * by the value's nodes once the tree exists. The processing instruction's name
 * is `${SLOT}-${slotSeq}`, where `slotSeq` is the incrementing number for each
 * expansion.
 *
 * The random part of the name keeps a value which is written into the template
 * text verbatim, as one inside a tag or at document level is, from naming a
 * slot by accident. It is not what stops such a value from naming one on
 * purpose. {@link assertFilled} is, by requiring that every slot be accounted
 * for exactly once, so do not read the name as a secret.
 */
const SLOT = `strophe-slot-${Math.random().toString(36).slice(2)}`;

/** Gives each expansion a {@link SLOT} of its own. */
let slotSeq = 0;

/** The element a fragment of spliced-in markup is parsed inside. */
const FRAGMENT = 'strophe-fragment';

/*
 * The cursor and the scanning functions below are exported for
 * `tests/scanner.test.ts`, which is the only thing outside this module that
 * reads them. They are not published API: `index.ts` takes `stx` and `Stanza`
 * from here and nothing else, so none of this reaches the `Strophe` object.
 */

/**
 * Where in the template the next value lands.
 */
export interface Cursor {
    mode: 'text' | 'tag' | 'comment' | 'cdata';
    quote: string; // Quote char of the attribute value being read, if any.
    depth: number; // How many elements enclose the point the cursor has reached.
    element: boolean; // Whether the tag being read is an element's, rather than a PI's.
    prev: string; // The character read before this one, to spot a self-closing tag.
    slot: string; // The processing instruction target this expansion stands values in.
}

/**
 * A cursor placed at the start of a template. A nested template shares it, so
 * the whole stanza is expanded with the one slot name and filled in one pass.
 */
export function newCursor(): Cursor {
    return { mode: 'text', quote: '', depth: 0, element: false, prev: '', slot: `${SLOT}-${slotSeq++}` };
}

/**
 * The run of text ended in the middle of what it was reading. The construct
 * carries on into the next run, so the cursor is left in the mode it reached.
 */
export const EXHAUSTED = -1;

/**
 * Element content, up to the `<` which ends it.
 *
 * What follows the `<` says what was opened. A comment and a CDATA section are
 * read whole by {@link scanDelimited}; everything else is a tag, and only some
 * tags are an element's.
 */
export function scanText(xml: string, i: number, cursor: Cursor): number {
    const lt = xml.indexOf('<', i);
    if (lt === -1) return EXHAUSTED;

    if (xml.startsWith('<!--', lt)) {
        cursor.mode = 'comment';
        return lt + 4;
    }
    if (xml.startsWith('<![CDATA[', lt)) {
        cursor.mode = 'cdata';
        return lt + 9;
    }

    // A processing instruction or a declaration is not an element, so it
    // encloses nothing.
    const next = xml[lt + 1];
    cursor.element = next !== '?' && next !== '!';
    if (cursor.element) cursor.depth += next === '/' ? -1 : 1;
    cursor.mode = 'tag';
    cursor.prev = '';
    return lt + 1;
}

/**
 * The inside of a tag, a character at a time, up to the `>` which ends it.
 *
 * A character at a time because a `>` inside an attribute value does not end
 * the tag, so the quoting has to be followed through, and because whether the
 * tag closed the element it opened is only readable from the character before
 * the `>`.
 */
export function scanTag(xml: string, i: number, cursor: Cursor): number {
    const c = xml[i];

    if (cursor.quote) {
        // Inside an attribute value, where only its own closing quote counts.
        if (c === cursor.quote) cursor.quote = '';
    } else if (c === '"' || c === "'") {
        cursor.quote = c;
    } else if (c === '>') {
        // `<a/>` opened and closed an element in the one tag.
        if (cursor.element && cursor.prev === '/') cursor.depth--;
        cursor.mode = 'text';
    }

    cursor.prev = c;
    return i + 1;
}

/**
 * A comment or a CDATA section, up to its closing token.
 *
 * Both are opaque. What they hold is not markup, so there is nothing in there
 * to count and nowhere in there to stand a value.
 */
export function scanDelimited(xml: string, i: number, cursor: Cursor): number {
    const close = cursor.mode === 'comment' ? '-->' : ']]>';
    const end = xml.indexOf(close, i);
    if (end === -1) return EXHAUSTED;

    cursor.mode = 'text';
    return end + close.length;
}

/**
 * How each mode reads. Keyed by every mode there is, so a new one cannot be
 * added to {@link Cursor} without saying how to read it.
 */
const SCANNERS: Record<Cursor['mode'], (xml: string, i: number, cursor: Cursor) => number> = {
    text: scanText,
    tag: scanTag,
    comment: scanDelimited,
    cdata: scanDelimited,
};

/**
 * Read a run of template text, leaving the cursor where that text ended.
 *
 * This is a lexer that answers the question where in the markup the next value
 * lands, because that decides whether it can be represented by a processing
 * instruction or has to be written out verbatim.
 *
 * The parser can't answer this because it needs the finished text with every
 * interpolated value already written, but the way the values are written (i.e.
 * with or without whitespace) depends on the answer.
 *
 * It is deliberately not a validator and rejects nothing, since the parser will
 * validate a moment later and will say it better. All it has to get right is which
 * of three places the text ended in, and how many elements are open there:
 *
 * - in element content, where a value can be stood in for by a processing
 *   instruction, so long as an element encloses it
 * - inside a tag, where no processing instruction can go, so the value is
 *   written out instead
 * - inside a comment or a CDATA section, likewise
 */
export function scan(xml: string, cursor: Cursor): void {
    let i = 0;
    while (i !== EXHAUSTED && i < xml.length) {
        i = SCANNERS[cursor.mode](xml, i, cursor);
    }
}

/**
 * Write text into the template, keeping the cursor in step with it.
 *
 * Everything which ends up in the text that is parsed goes through here, so
 * the cursor has read what the parser will read. A value written verbatim can
 * open or close a tag just as a static part of the template can, and if the
 * cursor did not see it the two would disagree about where the next value
 * lands. The single exception is a value at document level, which is allowed
 * to span the stanza and so is written without being read.
 */
function emit(xml: string, cursor: Cursor): string {
    scan(xml, cursor);
    return xml;
}

/**
 * A value as it is written into the template text, where what surrounds it is
 * markup and a string has to be escaped to be read as the characters it holds.
 */
function serializeValue(value: StanzaValue): string {
    if (Array.isArray(value)) return value.map(serializeValue).join('');
    if (value instanceof UnsafeXML || value instanceof Builder) return value.toString();
    return xmlescape((value ?? '').toString());
}

/**
 * A value as it is written inside an attribute value.
 *
 * The one position where a parser rewrites what it reads. A tab, a line feed or
 * a carriage return written literally into an attribute value is read back as a
 * space (XML 1.0 § 3.3.3), so a value's own whitespace would be flattened on its
 * way through the parser: exactly the loss this commit is about, in the one
 * position where a value cannot be stood in for and so has to go through the
 * parser at all. Written as a character reference each is read back as itself.
 *
 * A carriage return is not among them because {@link xmlText} has already turned
 * every one it could reach into a line feed.
 *
 * Interpolated markup is left as it stands, as it is everywhere else. An
 * attribute value holds no markup, so `unsafeXML` there says the text is already
 * written the way it is meant to be read.
 */
function serializeIntoAttribute(value: StanzaValue): string {
    if (Array.isArray(value)) return value.map(serializeIntoAttribute).join('');
    if (value instanceof UnsafeXML || value instanceof Builder) return value.toString();

    const text = xmlescape(xmlText((value ?? '').toString(), 'An interpolated value'));
    return text.replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;');
}

/**
 * A value as its own characters, with nothing escaped and no markup meant.
 */
function characterData(value: StanzaValue): string {
    if (Array.isArray(value)) return value.map(characterData).join('');
    if (value instanceof UnsafeXML || value instanceof Builder) return value.toString();
    return (value ?? '').toString();
}

/**
 * A value as it is written inside a CDATA section.
 *
 * A CDATA section escapes nothing. Everything up to the `]]>` which ends it is
 * character data as it stands, so a value goes in as its own characters: an `&`
 * written `&amp;` in there is read back as those five characters rather than as
 * an ampersand, which is what escaping it did.
 *
 * `]]>` is the one sequence a value cannot carry, since it would end the
 * section early and leave the rest of the value to be read as markup. XML has
 * no escape for it, so the section is closed and opened again around it: the
 * `]]` ends the first section and the `>` begins the second, and the two are
 * read back as one run of character data. {@link scanDelimited} follows the
 * same pair, so the cursor comes out of this still inside a CDATA section,
 * which is where the template left it.
 *
 * Splitting after the parts are joined rather than within each of them is what
 * catches a `]]>` which only exists because one part ended in `]]` and the next
 * began with `>`.
 */
function serializeIntoCdata(value: StanzaValue): string {
    return characterData(value).split(']]>').join(']]]]><![CDATA[>');
}

/**
 * @param node
 * @param slot - The target this expansion stands its values in.
 */
function isSlot(node: Node | null, slot: string): node is ProcessingInstruction {
    return !!node && node.nodeType === ElementType.PROCESSING_INSTRUCTION && node.nodeName === slot;
}

/**
 * Whether the node next to a run of template whitespace is a value which puts
 * text with something in it against it. Whitespace between two elements is
 * formatting, but whitespace next to text is part of that text.
 *
 * A value is asked about the end of it which faces the whitespace: the value
 * before a run faces it with its last node, the one after it with its first.
 * A string contributes the one text node, so both ends are the same node and
 * the question is simply whether the string has anything in it. Spliced-in
 * markup can begin in text and end in an element, or the other way about, so
 * the two ends are asked separately.
 *
 * A value which resolved to no nodes is looked past rather than answered for.
 * It puts nothing against the whitespace, so what the whitespace touches is
 * whatever lies beyond it. Answering `false` there would let an unrelated
 * optional value shadow the one next to it, and the line break in
 * `<body>\n${prefix}${text}</body>` would survive or not according to whether
 * `prefix` happened to be set.
 *
 * @param node - The sibling on that side of the whitespace, if there is one.
 * @param edge - The end of the value which faces the whitespace. Also says
 *  which way to keep looking when a value which resolved to nothing is passed
 *  over: `first` is the side after the whitespace, `last` the side before it.
 */
function abutsText(node: Node | null, slot: string, resolved: Resolved, edge: 'first' | 'last'): boolean {
    let sibling = node;
    while (isSlot(sibling, slot)) {
        const nodes = resolved.get(sibling);
        if (!nodes?.length) {
            sibling = edge === 'first' ? sibling.nextSibling : sibling.previousSibling;
            continue;
        }

        const end = nodes[edge === 'first' ? 0 : nodes.length - 1];
        // A CDATA section is text written another way, so it counts as text here.
        if (end.nodeType !== ElementType.TEXT && end.nodeType !== ElementType.CDATA) return false;

        return /\S/.test(end.nodeValue);
    }
    return false;
}

/**
 * The namespace declarations in scope at an element, written out as they would
 * appear on a tag.
 *
 * Every value under the one element is parsed in the same scope, so this is
 * worked out once per element in {@link resolve} rather than once per value.
 * The walk is up the ancestors, so the nearest declaration of a prefix is the
 * one which is kept and the rest are passed over.
 */
function inScopeDeclarations(context: Element): string {
    const declarations: string[] = [];
    const seen = new Set<string>();
    for (let el: Element | null = context; el; el = el.parentElement) {
        Array.from(el.attributes).forEach(({ nodeName, value }) => {
            if (nodeName !== 'xmlns' && !nodeName.startsWith('xmlns:')) return;
            if (seen.has(nodeName)) return;
            seen.add(nodeName);
            declarations.push(`${nodeName}="${xmlescape(value)}"`);
        });
    }
    return declarations.join(' ');
}

/**
 * Parse a fragment of markup as if it had been written where it was
 * interpolated, by repeating the namespace declarations in scope there.
 * Splicing markup in is then no different from writing it out in the template.
 */
function parseFragment(xml: string, declarations: string): Node[] {
    const doc = xmlHtmlNode(`<${FRAGMENT} ${declarations}>${xml}</${FRAGMENT}>`);
    const parserError = getParserError(doc);
    if (parserError) {
        throw new Error(
            `Parser Error: markup interpolated into an stx template must be well-formed on its own, ` +
                `and cannot open or close an element belonging to the template: ${xml}\n` +
                parserError.split(FRAGMENT).join('the enclosing element'),
        );
    }
    return Array.from((getFirstElementChild(doc) as Element).childNodes);
}

/**
 * The nodes a value contributes where it was interpolated.
 *
 * Markup is moved into the stanza's document rather than copied into it. Its
 * own document was made to parse it and is dropped as soon as it has been read,
 * so there is nothing for a copy to leave behind, and the deep copy
 * `importNode` makes is the most expensive thing about splicing a value in.
 *
 * A value in element content becomes a text node without the parser reading it,
 * so it goes through {@link xmlText} for the same reasons a text node built by
 * {@link Builder} does. It cannot use {@link xmlTextNode} to make the node,
 * since the node has to belong to the document the template was parsed into.
 */
function nodesFor(value: StanzaValue, context: Element, declarations: string): Node[] {
    const doc = context.ownerDocument as Document;
    if (value instanceof UnsafeXML || value instanceof Builder) {
        return parseFragment(value.toString(), declarations).map((node) => doc.adoptNode(node));
    }
    const text = xmlText((value ?? '').toString(), 'An interpolated value');
    return text ? [doc.createTextNode(text)] : [];
}

/**
 * The nodes each slot in the tree stands for, keyed by the slot itself.
 *
 * Keyed by the node rather than by the value's number so that two slots are two
 * entries even where they address the one value, which markup written into the
 * template text can arrange. Nodes are moved into place rather than copied, so
 * sharing them between two slots would move the first one's out again.
 */
type Resolved = Map<Node, Node[]>;

/**
 * Work out what each slot stands for, before any whitespace is weighed up.
 *
 * The template's whitespace next to a value is only formatting if what the
 * value puts there is not text, and that is a question about nodes rather than
 * about the string a value was written as. So the nodes have to exist before
 * {@link strip} runs, which means resolving here rather than at substitution.
 *
 * A slot addressing no value is left out, which is how {@link substitute} tells
 * one apart later without repeating the arithmetic.
 *
 * The namespace declarations every value under `el` is parsed in are the same,
 * so they are worked out at most once here, and only where there is a value to
 * parse: most elements have no slot under them at all.
 */
function resolve(el: Element, slots: StanzaValue[], slot: string, resolved: Resolved): void {
    let declarations: string | undefined;

    Array.from(el.childNodes).forEach((node) => {
        if (isSlot(node, slot)) {
            const index = Number(node.data);
            if (Number.isInteger(index) && index >= 0 && index < slots.length) {
                if (declarations === undefined) declarations = inScopeDeclarations(el);
                resolved.set(node, nodesFor(slots[index], el, declarations));
            }
        } else if (node.nodeType === ElementType.NORMAL) {
            resolve(node as Element, slots, slot, resolved);
        }
    });
}

/**
 * What {@link substitute} found, for {@link assertFilled} to check.
 */
interface Tally {
    filled: number[]; /** How many slots came back for each value. */
    stray: number; /** How many slots came back addressing no value at all. */
}

/**
 * Replace each slot with its value's nodes, recording what was found.
 *
 * The nodes a value contributes are inserted where its slot was and are not
 * descended into, so nothing which came from a value is ever rewritten. The
 * child list is read before anything is inserted, which is what keeps those
 * nodes out of the walk and so out of the tally: a value may hold a processing
 * instruction of its own, whatever it is called, without being read as a slot.
 *
 * A processing instruction the template wrote out itself has a target of its
 * own, so it isn't a slot and is passed over like any other node.
 */
function substitute(el: Element, slot: string, resolved: Resolved, tally: Tally): void {
    Array.from(el.childNodes).forEach((node) => {
        if (isSlot(node, slot)) {
            const nodes = resolved.get(node);
            if (nodes) {
                tally.filled[Number(node.data)]++;
                nodes.forEach((child) => el.insertBefore(child, node));
            } else {
                // Resolving left it out, so it addresses no value at all and
                // stands in for nothing.
                tally.stray++;
            }
            el.removeChild(node);
        } else if (node.nodeType === ElementType.NORMAL) {
            substitute(node as Element, slot, resolved, tally);
        }
    });
}

/**
 * Refuse to hand back a tree which doesn't account for every value exactly once.
 *
 * Each value is stood in for by one slot, so one slot has to come back.
 *
 * Fewer means a value never made it into the stanza. {@link Builder.serialize}
 * has no case for a processing instruction, so it would go out on the wire as
 * nothing at all, which is the silent loss this whole mechanism exists to
 * prevent. Markup written into the template text can cause it by leaving a slot
 * somewhere it stops being a node: inside a comment or a CDATA section it is
 * character data, and beside the root element it is outside the tree
 * {@link fill} walks.
 *
 * More means a slot came back which the template never wrote. The same markup
 * can put one there, and a slot is an address into the value list, so it would
 * let one value stand in for another. Refusing is the point: a value's markup
 * is its own and reaches no further.
 */
function assertFilled(tally: Tally): void {
    if (tally.filled.some((count) => count === 0)) {
        throw new Error(
            'An interpolated value never made it into the stanza. A value is only stood in for ' +
                'where an element encloses it, so markup written into the template text must not ' +
                'leave it inside a comment or a CDATA section, or beside the root element.',
        );
    }
    if (tally.stray || tally.filled.some((count) => count > 1)) {
        throw new Error(
            'Markup interpolated into the template carried a placeholder of its own. ' +
                'One value cannot stand in for another.',
        );
    }
}

/**
 * Remove the whitespace which the template's own formatting put between its
 * tags, replace the slots with their values, and check that every value was
 * accounted for.
 *
 * The nodes a value stands for are worked out first, and put into the tree
 * last. Stripping in between is what keeps the two kinds of whitespace apart:
 * a value is still a slot while it runs, so it cannot delete one, and yet the
 * nodes exist, so the predicate can ask what a value actually puts against the
 * whitespace next to it.
 *
 * That is the one thing {@link strip} cannot tell on its own: whitespace
 * written between two interpolations is content when it separates text and
 * formatting when it separates elements, which is the distinction XML itself
 * draws between mixed and element-only content. Where the answer is not the
 * wanted one, `xml:space="preserve"` is the way out.
 */
function fill(el: Element, slots: StanzaValue[], slot: string): void {
    const resolved: Resolved = new Map();
    resolve(el, slots, slot, resolved);

    strip(
        el,
        (node) =>
            abutsText(node.previousSibling, slot, resolved, 'last') ||
            abutsText(node.nextSibling, slot, resolved, 'first'),
    );

    const tally: Tally = { filled: new Array(slots.length).fill(0), stray: 0 };
    substitute(el, slot, resolved, tally);
    assertFilled(tally);
}

/**
 * A Stanza represents a XML element used in XMPP (commonly referred to as stanzas).
 */
export class Stanza extends Builder {
    #strings: string[];
    #values: StanzaValue[];

    constructor(strings: TemplateStringsArray, values: StanzaValue[]) {
        super('stanza');
        this.#strings = strings as unknown as string[];
        this.#values = values;
    }

    /**
     * A directive which can be used to pass a string of XML as a value to the
     * stx tagged template literal.
     *
     * It's considered "unsafe" because it can pose a security risk if used with
     * untrusted input.
     *
     * @example
     *    const status = '<status>I am busy!</status>';
     *    const pres = stx`
     *       <presence from='juliet@example.com/chamber' id='pres1'>
     *           <show>dnd</show>
     *           ${unsafeXML(status)}
     *       </presence>`;
     *    connection.send(pres);
     */
    static unsafeXML(string: string): UnsafeXML {
        return new UnsafeXML(string);
    }

    /**
     * Turns the passed-in string into an XML Element.
     */
    static toElement(string: string, throwErrorIfInvalidNS?: boolean): Element {
        const doc = xmlHtmlNode(string);
        const parserError = getParserError(doc);
        if (parserError) {
            throw new Error(`Parser Error: ${parserError}`);
        }

        const node = stripWhitespace(getFirstElementChild(doc) as Element);
        checkNamespace(node, throwErrorIfInvalidNS);
        return node;
    }

    /**
     * Build the stanza the template describes.
     */
    buildTree(): Element {
        const slots: StanzaValue[] = [];
        const cursor = newCursor();
        // Trimmed here and nowhere else. This is the whole template, so what is
        // cut lies outside the root element, where it is neither content nor
        // syntax and the parser would pass over it anyway. Nothing is scanned
        // afterwards either, so the cursor cannot be left describing text which
        // is no longer there, which is what the same trim did to a nested
        // template until it was taken out of {@link Stanza.expandValue}.
        const template = this.#expand(slots, cursor).trim();

        const doc = xmlHtmlNode(template);
        const parserError = getParserError(doc);
        if (parserError) {
            throw new Error(`Parser Error: ${parserError}`);
        }

        const node = getFirstElementChild(doc) as Element;
        fill(node, slots, cursor.slot);
        checkNamespace(node, true);
        return node;
    }

    /**
     * The template text with a {@link SLOT} standing in for each value which
     * lands in element content. A nested template is expanded into the same
     * text, so the whole stanza is one parse and the nested template's own
     * indentation is stripped like any other.
     */
    #expand(slots: StanzaValue[], cursor: Cursor): string {
        return this.#strings.reduce((acc, str, idx) => {
            acc += emit(str, cursor);
            if (this.#values.length <= idx) return acc;
            return acc + Stanza.#expandValue(this.#values[idx], slots, cursor);
        }, '');
    }

    static #expandValue(value: StanzaValue, slots: StanzaValue[], cursor: Cursor): string {
        // Inside an attribute value, which is inside a tag and so is one of the
        // places below, but is the one the parser does not read verbatim. A
        // quote is only ever open in a tag, so this cannot catch anything else.
        if (cursor.quote) return emit(serializeIntoAttribute(value), cursor);

        // Inside a tag, a comment or a CDATA section there is no node to stand
        // in for, so the value is written into the text as it always was. What
        // that text has to look like is not the same in all three: a CDATA
        // section reads it as characters, the other two as markup.
        if (cursor.mode === 'cdata') return emit(serializeIntoCdata(value), cursor);
        if (cursor.mode !== 'text') return emit(serializeValue(value), cursor);

        if (Array.isArray(value)) {
            return value.map((v) => Stanza.#expandValue(v, slots, cursor)).join('');
        }
        // A nested template is expanded into the same text, and what it expands
        // to is left exactly as the cursor read it.
        //
        // It used to be trimmed, which is where the two could part company: the
        // cursor scans every run as {@link emit} writes it, so cutting
        // characters off afterwards left it holding a state for text which was
        // no longer there. A nested template ending in a tag lost the space
        // between an element's name and the attribute the outer template went
        // on to write, and one ending in `/ ` left the cursor believing an
        // element was still open, which put the next value on the wrong side of
        // {@link Cursor.depth}.
        //
        // Nothing is lost by leaving it: whitespace at the ends of a nested
        // template is between tags like any other, so {@link strip} takes it if
        // it is formatting and keeps it if it is content, which is the same
        // judgement it makes everywhere else. The trim could not tell those
        // apart, and cut inside tags as readily as between them.
        if (value instanceof Stanza) {
            return value.#expand(slots, cursor);
        }
        // At document level there is no element for a node to land in.
        // The value is the stanza itself rather than content inside one, so it is
        // written into the text and parsed as markup.
        //
        // This is the one thing the cursor deliberately does not read. A value
        // here is allowed to span, so that a stanza may be opened by one and
        // closed by another; reading it would leave the cursor inside the
        // element it opened, and the value which closes that element again
        // would be stood in for rather than written out.
        if (cursor.depth <= 0) return serializeValue(value);

        slots.push(value);
        return emit(`<?${cursor.slot} ${slots.length - 1}?>`, cursor);
    }
}

/**
 * Tagged template literal function which generates {@link Stanza} objects
 *
 * @example
 *      const pres = stx`<presence type="${type}" xmlns="jabber:client"><show>${show}</show></presence>`
 *      connection.send(pres);
 *
 * @example
 *      const msg = stx`<message
 *          from='sender@example.org'
 *          id='hgn27af1'
 *          to='recipient@example.org'
 *          type='chat'>
 *          <body>Hello world</body>
 *      </message>`;
 *
 *      connection.send(msg);
 *
 * Templates may be indented freely. The whitespace written between their tags
 * is formatting and is removed. However, whitespace which arrives through a `${}`
 * value (and is not itself inside a template) is considered content and kept.
 *
 * So the rule to write by is that whitespace you want on the wire goes inside
 * the `${}`.
 *
 *      stx`<div xmlns="${XHTML}">${[link1, '\n', link2]}</div>`  // kept
 *      stx`<div xmlns="${XHTML}">${link1}
 *          ${link2}</div>`                                      // removed
 *
 * Which way the template's own indentation around a `${}` goes is decided by
 * what the value puts against it, not by how the value was written. Indentation
 * against text is part of that text and is kept; indentation against an element
 * separates elements and is formatting, so it is removed. A string and markup
 * which begins and ends in text therefore lay out alike:
 *
 *      stx`<c>
 *          ${'hello'}
 *      </c>`                     // <c> holds a line break, "hello", a line break
 *      stx`<c>
 *          ${unsafeXML('hello')}
 *      </c>`                     // the same
 *      stx`<c>
 *          ${unsafeXML('<p>hello</p>')}
 *      </c>`                     // <c> holds only the <p>
 *
 * Each end is read on its own, so markup which begins in text and ends in an
 * element keeps the indentation before it and loses the indentation after it.
 * Whitespace inside the value is its own either way and is never touched.
 *
 * Two things are exempt, because their whitespace is read rather than laid
 * out: an XHTML-IM `<body>`, the one in the XHTML namespace, where a run of
 * whitespace between two inline elements separates words, and any subtree
 * marked `xml:space="preserve"`. The latter is also how to keep whitespace in
 * a string passed to {@link Stanza.toElement}, where there is no `${}` to put
 * it in. Either may opt out again with `xml:space="default"`.
 *
 * A value interpolated at document level, where no element encloses it, is
 * the exception to all of the above. It is the stanza rather than content
 * within one, so it is considered markup like a template's and its whitespace
 * is stripped the same way:
 *
 *      const xhtml = `<title type="xhtml"><div xmlns="${XHTML}">
 *          <a href="${a}">@bob</a>\n<a href="${b}">link</a>
 *      </div></title>`;
 *
 *      stx`<message xmlns="jabber:client">${unsafeXML(xhtml)}</message>`
 *      // the line break between the two <a> elements is kept
 *
 *      stx`${unsafeXML(`<message xmlns="jabber:client">${xhtml}</message>`)}`
 *      // it is stripped, along with the template's own indentation
 *
 * The two are told apart by where the whitespace came from, and at document
 * level that is no longer knowable. `xml:space="preserve"` is the only handle
 * there, so mark the elements whose whitespace matters before passing the markup in.
 *
 * Whitespace between XHTML elements is fragile in general, since it collapses
 * to a single space when rendered and this library is not the only thing
 * which may drop it. The business rules of XEP-0071 recommend writing a line
 * break as `<br/>` and whitespace which carries meaning as the equivalent
 * number of no-break spaces, which survives regardless.
 */
export function stx(strings: TemplateStringsArray, ...values: StanzaValue[]): Stanza {
    return new Stanza(strings, values);
}
