import log from './log';

/*
 * Reading and checking the namespace of an element, in a module of its own so
 * that everything which needs to can reach it.
 *
 * Neither function can live in `utils`, which is where the rest of this kind of
 * thing is. `whitespace` needs {@link getNamespace} and `utils` imports
 * `whitespace` for {@link stripWhitespace}, so `whitespace` cannot import
 * `utils` back without a cycle; and `stanza` needs {@link checkNamespace} but
 * so does `utils.toElement`, which is the function the transports call, so
 * neither of those two is the place for it either.
 *
 * {@link getNamespace} is re-exported by `utils`, which is what puts it on the
 * `Strophe` object. {@link checkNamespace} is internal and stays here.
 */

/**
 * Return the XML namespace of an element.
 *
 * Prefers the serialized `xmlns` attribute and falls back to the DOM
 * `namespaceURI`, because the two diverge depending on how the element was
 * built and neither is reliable on its own:
 *
 *  - Locally-built stanzas (`$iq`, `stx`, {@link Builder}) are created with
 *    `createElement` and carry their namespace only in the `xmlns` attribute;
 *    their `namespaceURI` is null.
 *  - Stanzas received over the XEP-0114 component transport are built with
 *    `createElementNS` and carry their namespace only on `namespaceURI`; the
 *    redundant `xmlns` attribute is omitted.
 *  - WebSocket / BOSH stanzas parsed by `DOMParser` carry both, except on
 *    child elements that inherit the default namespace without redeclaring it
 *    (those have only `namespaceURI`).
 *
 * Checking both is the transport-agnostic way to read an element's namespace.
 *
 * @method Strophe.getNamespace
 * @param elem - The element whose namespace is wanted.
 * @returns The namespace URI, or null if the element has none.
 */
export function getNamespace(elem: Element): string | null {
    return elem.getAttribute('xmlns') || elem.namespaceURI;
}

/**
 * Complain about a stanza which is in neither of the namespaces a stanza may
 * be in.
 *
 * Only `message`, `iq` and `presence` are stanzas. Anything else is some other
 * element which happens to have been passed in, and is in whatever namespace
 * it likes.
 *
 * Reads `namespaceURI` rather than going through {@link getNamespace} because
 * every caller hands it an element which has just come out of the parser,
 * where the resolved namespace is the one that counts.
 *
 * @param node - The element to check.
 * @param throwErrorIfInvalidNS - Whether the wrong namespace is fatal rather
 *  than merely logged.
 */
export function checkNamespace(node: Element, throwErrorIfInvalidNS?: boolean): void {
    if (!['message', 'iq', 'presence'].includes(node.nodeName.toLowerCase())) return;
    if (node.namespaceURI === 'jabber:client' || node.namespaceURI === 'jabber:server') return;

    const err_msg = `Invalid namespaceURI ${node.namespaceURI}`;
    if (throwErrorIfInvalidNS) {
        throw new Error(err_msg);
    } else {
        log.error(err_msg);
    }
}
