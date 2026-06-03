import { ElementType, NS } from './constants';
import { copyElement, createHtml, toElement, xmlElement, xmlGenerator, xmlTextNode, xmlescape } from './utils';

export type StanzaAttrs = Record<string, string | number>;

/**
 * Create a {@link Strophe.Builder}
 * This is an alias for `new Strophe.Builder(name, attrs)`.
 * @param name - The root element name.
 * @param attrs - The attributes for the root element in object notation.
 * @returns A new Strophe.Builder object.
 */
export function $build(name: string, attrs?: StanzaAttrs): Builder {
    return new Builder(name, attrs);
}

/**
 * Create a {@link Strophe.Builder} with a `<message/>` element as the root.
 * @param attrs - The <message/> element attributes in object notation.
 * @returns A new Strophe.Builder object.
 */
export function $msg(attrs?: Record<string, string>): Builder {
    return new Builder('message', attrs);
}

/**
 * Create a {@link Strophe.Builder} with an `<iq/>` element as the root.
 * @param attrs - The <iq/> element attributes in object notation.
 * @returns A new Strophe.Builder object.
 */
export function $iq(attrs?: Record<string, string>): Builder {
    return new Builder('iq', attrs);
}

/**
 * Create a {@link Strophe.Builder} with a `<presence/>` element as the root.
 * @param attrs - The <presence/> element attributes in object notation.
 * @returns A new Strophe.Builder object.
 */
export function $pres(attrs?: Record<string, string>): Builder {
    return new Builder('presence', attrs);
}

/**
 * This class provides an interface similar to JQuery but for building
 * DOM elements easily and rapidly.  All the functions except for `toString()`
 * and tree() return the object, so calls can be chained.
 *
 * The corresponding DOM manipulations to get a similar fragment would be
 * a lot more tedious and probably involve several helper variables.
 *
 * Since adding children makes new operations operate on the child, up()
 * is provided to traverse up the tree.  To add two children, do
 * > builder.c('child1', ...).up().c('child2', ...)
 *
 * The next operation on the Builder will be relative to the second child.
 *
 * @example
 *  // Here's an example using the $iq() builder helper.
 *  $iq({to: 'you', from: 'me', type: 'get', id: '1'})
 *      .c('query', {xmlns: 'strophe:example'})
 *      .c('example')
 *      .toString()
 *
 *  // The above generates this XML fragment
 *  //  <iq to='you' from='me' type='get' id='1'>
 *  //    <query xmlns='strophe:example'>
 *  //      <example/>
 *  //    </query>
 *  //  </iq>
 */
class Builder {
    #nodeTree: Element | undefined;
    #node: Element | undefined;
    #name: string;
    #attrs: StanzaAttrs | undefined;

    /**
     * The attributes should be passed in object notation.
     * @param name - The name of the root element.
     * @param attrs - The attributes for the root element in object notation.
     * @example const b = new Builder('message', {to: 'you', from: 'me'});
     * @example const b = new Builder('messsage', {'xml:lang': 'en'});
     */
    constructor(name: string, attrs?: StanzaAttrs) {
        // Set correct namespace for jabber:client elements
        if (name === 'presence' || name === 'message' || name === 'iq') {
            if (attrs && !attrs.xmlns) {
                attrs.xmlns = NS.CLIENT;
            } else if (!attrs) {
                attrs = { xmlns: NS.CLIENT };
            }
        }

        this.#name = name;
        this.#attrs = attrs;
    }

    /**
     * Creates a new Builder object from an XML string.
     * @param str
     * @returns
     * @example const stanza = Builder.fromString('<presence from="juliet@example.com/chamber"></presence>');
     */
    static fromString(str: string): Builder {
        const el = toElement(str, true);
        const b = new Builder('');
        b.#nodeTree = el;
        return b;
    }

    buildTree(): Element | null {
        return xmlElement(this.#name, this.#attrs);
    }

    get nodeTree(): Element {
        if (!this.#nodeTree) {
            // Holds the tree being built.
            this.#nodeTree = this.buildTree()!;
        }
        return this.#nodeTree;
    }

    get node(): Element {
        if (!this.#node) {
            this.#node = this.tree();
        }
        return this.#node;
    }

    set node(el: Element) {
        this.#node = el;
    }

    /**
     * Render a DOM element and all descendants to a String.
     * @param elem - A DOM element.
     * @returns The serialized element tree as a String.
     */
    static serialize(elem: Element | Builder | null): string | null {
        if (!elem) return null;

        const el = elem instanceof Builder ? elem.tree() : elem;

        const names = [...Array(el.attributes.length).keys()].map((i) => el.attributes[i].nodeName);
        names.sort();
        let result = names.reduce(
            (a, n) => `${a} ${n}="${xmlescape(el.attributes.getNamedItem(n)!.value)}"`,
            `<${el.nodeName}`
        );

        if (el.childNodes.length > 0) {
            result += '>';
            for (let i = 0; i < el.childNodes.length; i++) {
                const child = el.childNodes[i];
                switch (child.nodeType) {
                    case ElementType.NORMAL:
                        result += Builder.serialize(child as Element);
                        break;
                    case ElementType.TEXT:
                        result += xmlescape(child.nodeValue);
                        break;
                    case ElementType.CDATA:
                        result += '<![CDATA[' + child.nodeValue + ']]>';
                }
            }
            result += '</' + el.nodeName + '>';
        } else {
            result += '/>';
        }
        return result;
    }

    /**
     * Return the DOM tree.
     *
     * This function returns the current DOM tree as an element object.  This
     * is suitable for passing to functions like Strophe.Connection.send().
     *
     * @returns The DOM tree as a element object.
     */
    tree(): Element {
        return this.nodeTree;
    }

    /**
     * Serialize the DOM tree to a String.
     *
     * This function returns a string serialization of the current DOM
     * tree.  It is often used internally to pass data to a
     * Strophe.Request object.
     *
     * @returns The serialized DOM tree in a String.
     */
    toString(): string {
        return Builder.serialize(this.tree())!;
    }

    /**
     * Make the current parent element the new current element.
     * This function is often used after c() to traverse back up the tree.
     *
     * @example
     *  // For example, to add two children to the same element
     *  builder.c('child1', {}).up().c('child2', {});
     *
     * @returns The Strophe.Builder object.
     */
    up(): Builder {
        this.node = this.node.parentElement ? this.node.parentElement : (this.node.parentNode as Element);
        return this;
    }

    /**
     * Make the root element the new current element.
     *
     * When at a deeply nested element in the tree, this function can be used
     * to jump back to the root of the tree, instead of having to repeatedly
     * call up().
     *
     * @returns The Strophe.Builder object.
     */
    root(): Builder {
        this.node = this.tree();
        return this;
    }

    /**
     * Add or modify attributes of the current element.
     *
     * The attributes should be passed in object notation.
     * This function does not move the current element pointer.
     * @param moreattrs - The attributes to add/modify in object notation.
     *  If an attribute is set to `null` or `undefined`, it will be removed.
     * @returns The Strophe.Builder object.
     */
    attrs(moreattrs: Record<string, string | number | null>): Builder {
        for (const k in moreattrs) {
            if (Object.prototype.hasOwnProperty.call(moreattrs, k)) {
                if (moreattrs[k] != null) {
                    this.node.setAttribute(k, moreattrs[k]!.toString());
                } else {
                    this.node.removeAttribute(k);
                }
            }
        }
        return this;
    }

    /**
     * Add a child to the current element and make it the new current
     * element.
     *
     * This function moves the current element pointer to the child,
     * unless text is provided.  If you need to add another child, it
     * is necessary to use up() to go back to the parent in the tree.
     *
     * @param name - The name of the child.
     * @param attrs - The attributes of the child in object notation.
     * @param text - The text to add to the child.
     *
     * @returns The Strophe.Builder object.
     */
    c(name: string, attrs?: Record<string, string> | string, text?: string): Builder {
        const child = xmlElement(name, attrs, text);
        this.node.appendChild(child!);
        if (typeof text !== 'string' && typeof text !== 'number') {
            this.node = child!;
        }
        return this;
    }

    /**
     * Add a child to the current element and make it the new current
     * element.
     *
     * This function is the same as c() except that instead of using a
     * name and an attributes object to create the child it uses an
     * existing DOM element object.
     *
     * @param elem - A DOM element.
     * @returns The Strophe.Builder object.
     */
    cnode(elem: Element | Builder): Builder {
        if (elem instanceof Builder) {
            elem = elem.tree();
        }
        let impNode: boolean;
        const xmlGen = xmlGenerator();
        try {
            impNode = xmlGen.importNode !== undefined;
        } catch (_e) {
            impNode = false;
        }

        const newElem = impNode ? xmlGen.importNode(elem, true) : copyElement(elem);
        this.node.appendChild(newElem!);
        this.node = newElem as Element;
        return this;
    }

    /**
     * Add a child text element.
     *
     * This *does not* make the child the new current element since there
     * are no children of text elements.
     *
     * @param text - The text data to append to the current element.
     * @returns The Strophe.Builder object.
     */
    t(text: string): Builder {
        const child = xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    }

    /**
     * Replace current element contents with the HTML passed in.
     *
     * This *does not* make the child the new current element
     *
     * @param html - The html to insert as contents of current element.
     * @returns The Strophe.Builder object.
     */
    h(html: string): Builder {
        const fragment = xmlGenerator().createElement('body');
        fragment.innerHTML = html;
        const xhtml = createHtml(fragment);
        while (xhtml!.childNodes.length > 0) {
            this.node.appendChild(xhtml!.childNodes[0]);
        }
        return this;
    }
}

export default Builder;
