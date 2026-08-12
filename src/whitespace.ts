import { ElementType, NS } from './constants';
import { getNamespace } from './namespace';

/**
 * Whether an element's whitespace-only text children are content instead of
 * formatting.
 *
 * @param el
 * @param inherited - Whether an ancestor already asked for preservation.
 */
function preservesWhitespace(el: Element, inherited: boolean): boolean {
    // XML 1.0 § 2.10: xml:space applies to the element and all its
    // descendants, until a descendant overrides it.
    const space = el.getAttribute('xml:space');
    if (space === 'preserve') return true;
    if (space === 'default') return false;
    // The XHTML-IM body of XEP-0071: markup a human wrote to be read, in which
    // a run of whitespace between two inline elements separates words rather
    // than laying them out, so removing it runs the words together.
    //
    // Only that <body>, which is why the namespace is read and not just the
    // name. A <body> anywhere else is a different element which happens to
    // share the name: a plain-text message body, whose whitespace is already
    // kept by the single-text-node rule above and which otherwise holds nothing
    // but the template's own indentation, or a BOSH wrapper, whose layout is
    // nobody's content.
    //
    // XHTML in some other element, such as the <div> of an Atom type="xhtml"
    // construct, is laid out by whatever wrote it and is stripped like the rest
    // of it. Interpolate the parts to keep the whitespace between them, which
    // is the whole point of a value being a value, or mark the element
    // `xml:space="preserve"` where there is no `${}` to put them in.
    //
    // Being a guess about what the markup is for, it loses to xml:space either
    // way round: the checks above come first, so `xml:space="default"` opts an
    // XHTML-IM body back out again.
    //
    // Read through {@link getNamespace} rather than off `namespaceURI`: a
    // stanza built rather than parsed, which is what `Builder` and `$msg().c()`
    // produce, carries its namespace in an `xmlns` attribute and has no
    // `namespaceURI` at all.
    if (getNamespace(el) === NS.XHTML && el.localName.toLowerCase() === 'body') return true;
    return inherited;
}

/**
 * Remove the whitespace which pretty-printing put between an element's tags.
 *
 * XML written by hand (or via the `stx` template literal) is usually indented,
 * and parsing it turns each run of indentation into a text node. Those
 * whitespace-only text nodes are formatting, not content, so they're removed.
 * Whitespace which is content is kept:
 *
 * - An element whose only child is a text node keeps it, so `<body>   </body>`
 *   survives intact.
 * - A subtree marked `xml:space="preserve"` is left alone, per XML 1.0 § 2.10,
 *   until a descendant sets `xml:space="default"` again.
 * - An XHTML-IM `<body>`, the one in the XHTML namespace, is left alone, since
 *   the whitespace between its inline elements separates words rather than
 *   laying them out, unless it sets `xml:space="default"`.
 * - Anything `keep` claims, which is how a caller which knows more than this
 *   function does says so.
 *
 * Kept out of `utils` because everything `utils` exports is spread onto the
 * `Strophe` object, and `keep` and `preserve` are internal rather than public
 * API. {@link stripWhitespace} is the public entry point.
 *
 * @param el
 * @param keep - Whether a whitespace-only text node is content after all.
 * @param preserve - Whether an ancestor asked for whitespace to be preserved.
 *  Only the recursion passes this.
 * @returns
 */
export function strip(el: Element, keep: (node: Node) => boolean, preserve = false): Element {
    preserve = preservesWhitespace(el, preserve);

    const childNodes = Array.from(el.childNodes);
    if (childNodes.length === 1 && childNodes[0].nodeType === ElementType.TEXT) {
        return el;
    }
    childNodes.forEach((node) => {
        if (node.nodeType === ElementType.TEXT) {
            if (!preserve && !/\S/.test(node.nodeValue) && !keep(node)) {
                el.removeChild(node);
            }
        } else if (node.nodeType === ElementType.NORMAL) {
            strip(node as Element, keep, preserve);
        }
    });
    return el;
}
