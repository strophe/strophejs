/**
 * XEP-0198 Stream Management
 *
 * The page-side {@link StanzaView} adapter.
 *
 * The page counterpart of parse.ts: where the worker builds views from raw
 * frame strings, the page builds them from the DOM Elements it already has.
 * Page-only: XMLSerializer is a DOM global, so this module must never be
 * imported by the shared-connection-worker bundle. Keeping it in its own
 * file makes that boundary structural instead of comment-enforced.
 */
import { StanzaView } from './types';

/**
 * Build the environment-free {@link StanzaView} consumed by the XEP-0198
 * engine from a DOM Element.
 * @param el
 */
export function toStanzaView(el: Element): StanzaView {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs[attr.name] = attr.value;
    }
    return { name: el.tagName, attrs, serialized: new XMLSerializer().serializeToString(el) };
}
