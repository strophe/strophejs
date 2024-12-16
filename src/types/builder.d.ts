/**
 * Create a {@link Strophe.Builder}
 * This is an alias for `new Strophe.Builder(name, attrs)`.
 * @param {string} name - The root element name.
 * @param {Object.<string,string|number>} [attrs] - The attributes for the root element in object notation.
 * @return {Builder} A new Strophe.Builder object.
 */
export function $build(name: string, attrs?: {
    [x: string]: string | number;
}): Builder;
/**
 * Create a {@link Strophe.Builder} with a `<message/>` element as the root.
 * @param {Object.<string,string>} [attrs] - The <message/> element attributes in object notation.
 * @return {Builder} A new Strophe.Builder object.
 */
export function $msg(attrs?: {
    [x: string]: string;
}): Builder;
/**
 * Create a {@link Strophe.Builder} with an `<iq/>` element as the root.
 * @param {Object.<string,string>} [attrs] - The <iq/> element attributes in object notation.
 * @return {Builder} A new Strophe.Builder object.
 */
export function $iq(attrs?: {
    [x: string]: string;
}): Builder;
/**
 * Create a {@link Strophe.Builder} with a `<presence/>` element as the root.
 * @param {Object.<string,string>} [attrs] - The <presence/> element attributes in object notation.
 * @return {Builder} A new Strophe.Builder object.
 */
export function $pres(attrs?: {
    [x: string]: string;
}): Builder;
export default Builder;
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
declare class Builder {
    /**
     * Creates a new Builder object from an XML string.
     * @param {string} str
     * @returns {Builder}
     * @example const stanza = Builder.fromString('<presence from="juliet@example.com/chamber"></presence>');
     */
    static fromString(str: string): Builder;
    /**
     * Render a DOM element and all descendants to a String.
     * @param {Element|Builder} elem - A DOM element.
     * @return {string} - The serialized element tree as a String.
     */
    static serialize(elem: Element | Builder): string;
    /**
     * The attributes should be passed in object notation.
     * @param {string} name - The name of the root element.
     * @param {StanzaAttrs} [attrs] - The attributes for the root element in object notation.
     * @example const b = new Builder('message', {to: 'you', from: 'me'});
     * @example const b = new Builder('messsage', {'xml:lang': 'en'});
     */
    constructor(name: string, attrs?: {
        [x: string]: string | number;
    });
    buildTree(): Element;
    /** @return {Element} */
    get nodeTree(): Element;
    /** @param {Element} el */
    set node(el: Element);
    /** @return {Element} */
    get node(): Element;
    /**
     * Return the DOM tree.
     *
     * This function returns the current DOM tree as an element object.  This
     * is suitable for passing to functions like Strophe.Connection.send().
     *
     * @return {Element} The DOM tree as a element object.
     */
    tree(): Element;
    /**
     * Serialize the DOM tree to a String.
     *
     * This function returns a string serialization of the current DOM
     * tree.  It is often used internally to pass data to a
     * Strophe.Request object.
     *
     * @return {string} The serialized DOM tree in a String.
     */
    toString(): string;
    /**
     * Make the current parent element the new current element.
     * This function is often used after c() to traverse back up the tree.
     *
     * @example
     *  // For example, to add two children to the same element
     *  builder.c('child1', {}).up().c('child2', {});
     *
     * @return {Builder} The Strophe.Builder object.
     */
    up(): Builder;
    /**
     * Make the root element the new current element.
     *
     * When at a deeply nested element in the tree, this function can be used
     * to jump back to the root of the tree, instead of having to repeatedly
     * call up().
     *
     * @return {Builder} The Strophe.Builder object.
     */
    root(): Builder;
    /**
     * Add or modify attributes of the current element.
     *
     * The attributes should be passed in object notation.
     * This function does not move the current element pointer.
     * @param {Object.<string, string|number|null>} moreattrs - The attributes to add/modify in object notation.
     *  If an attribute is set to `null` or `undefined`, it will be removed.
     * @return {Builder} The Strophe.Builder object.
     */
    attrs(moreattrs: {
        [x: string]: string | number;
    }): Builder;
    /**
     * Add a child to the current element and make it the new current
     * element.
     *
     * This function moves the current element pointer to the child,
     * unless text is provided.  If you need to add another child, it
     * is necessary to use up() to go back to the parent in the tree.
     *
     * @param {string} name - The name of the child.
     * @param {Object.<string, string>|string} [attrs] - The attributes of the child in object notation.
     * @param {string} [text] - The text to add to the child.
     *
     * @return {Builder} The Strophe.Builder object.
     */
    c(name: string, attrs?: {
        [x: string]: string;
    } | string, text?: string): Builder;
    /**
     * Add a child to the current element and make it the new current
     * element.
     *
     * This function is the same as c() except that instead of using a
     * name and an attributes object to create the child it uses an
     * existing DOM element object.
     *
     * @param {Element} elem - A DOM element.
     * @return {Builder} The Strophe.Builder object.
     */
    cnode(elem: Element): Builder;
    /**
     * Add a child text element.
     *
     * This *does not* make the child the new current element since there
     * are no children of text elements.
     *
     * @param {string} text - The text data to append to the current element.
     * @return {Builder} The Strophe.Builder object.
     */
    t(text: string): Builder;
    /**
     * Replace current element contents with the HTML passed in.
     *
     * This *does not* make the child the new current element
     *
     * @param {string} html - The html to insert as contents of current element.
     * @return {Builder} The Strophe.Builder object.
     */
    h(html: string): Builder;
    #private;
}
//# sourceMappingURL=builder.d.ts.map