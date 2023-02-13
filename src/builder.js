import { NS } from './constants.js';
import { copyElement, createHtml, serialize, xmlElement, xmlGenerator, xmlTextNode } from './utils.js';

/** Class: Strophe.Builder
 *  XML DOM builder.
 *
 *  This object provides an interface similar to JQuery but for building
 *  DOM elements easily and rapidly.  All the functions except for toString()
 *  and tree() return the object, so calls can be chained.  Here's an
 *  example using the $iq() builder helper.
 *  > $iq({to: 'you', from: 'me', type: 'get', id: '1'})
 *  >     .c('query', {xmlns: 'strophe:example'})
 *  >     .c('example')
 *  >     .toString()
 *
 *  The above generates this XML fragment
 *  > <iq to='you' from='me' type='get' id='1'>
 *  >   <query xmlns='strophe:example'>
 *  >     <example/>
 *  >   </query>
 *  > </iq>
 *  The corresponding DOM manipulations to get a similar fragment would be
 *  a lot more tedious and probably involve several helper variables.
 *
 *  Since adding children makes new operations operate on the child, up()
 *  is provided to traverse up the tree.  To add two children, do
 *  > builder.c('child1', ...).up().c('child2', ...)
 *  The next operation on the Builder will be relative to the second child.
 */

/** Constructor: Strophe.Builder
 *  Create a Strophe.Builder object.
 *
 *  The attributes should be passed in object notation.  For example
 *  > let b = new Builder('message', {to: 'you', from: 'me'});
 *  or
 *  > let b = new Builder('messsage', {'xml:lang': 'en'});
 *
 *  Parameters:
 *    (String) name - The name of the root element.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder.
 */

export default class Builder {

    constructor (name, attrs) {
        // Set correct namespace for jabber:client elements
        if (name === 'presence' || name === 'message' || name === 'iq') {
            if (attrs && !attrs.xmlns) {
                attrs.xmlns = NS.CLIENT;
            } else if (!attrs) {
                attrs = { xmlns: NS.CLIENT };
            }
        }
        // Holds the tree being built.
        this.nodeTree = xmlElement(name, attrs);
        // Points to the current operation node.
        this.node = this.nodeTree;
    }

    /** Function: tree
     *  Return the DOM tree.
     *
     *  This function returns the current DOM tree as an element object.  This
     *  is suitable for passing to functions like Strophe.Connection.send().
     *
     *  Returns:
     *    The DOM tree as a element object.
     */
    tree () {
        return this.nodeTree;
    }

    /** Function: toString
     *  Serialize the DOM tree to a String.
     *
     *  This function returns a string serialization of the current DOM
     *  tree.  It is often used internally to pass data to a
     *  Strophe.Request object.
     *
     *  Returns:
     *    The serialized DOM tree in a String.
     */
    toString () {
        return serialize(this.nodeTree);
    }

    /** Function: up
     *  Make the current parent element the new current element.
     *
     *  This function is often used after c() to traverse back up the tree.
     *  For example, to add two children to the same element
     *  > builder.c('child1', {}).up().c('child2', {});
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    up () {
        this.node = this.node.parentNode;
        return this;
    }

    /** Function: root
     *  Make the root element the new current element.
     *
     *  When at a deeply nested element in the tree, this function can be used
     *  to jump back to the root of the tree, instead of having to repeatedly
     *  call up().
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    root () {
        this.node = this.nodeTree;
        return this;
    }

    /** Function: attrs
     *  Add or modify attributes of the current element.
     *
     *  The attributes should be passed in object notation.  This function
     *  does not move the current element pointer.
     *
     *  Parameters:
     *    (Object) moreattrs - The attributes to add/modify in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    attrs (moreattrs) {
        for (const k in moreattrs) {
            if (Object.prototype.hasOwnProperty.call(moreattrs, k)) {
                if (moreattrs[k] === undefined) {
                    this.node.removeAttribute(k);
                } else {
                    this.node.setAttribute(k, moreattrs[k]);
                }
            }
        }
        return this;
    }

    /** Function: c
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function moves the current element pointer to the child,
     *  unless text is provided.  If you need to add another child, it
     *  is necessary to use up() to go back to the parent in the tree.
     *
     *  Parameters:
     *    (String) name - The name of the child.
     *    (Object) attrs - The attributes of the child in object notation.
     *    (String) text - The text to add to the child.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    c (name, attrs, text) {
        const child = xmlElement(name, attrs, text);
        this.node.appendChild(child);
        if (typeof text !== 'string' && typeof text !== 'number') {
            this.node = child;
        }
        return this;
    }

    /** Function: cnode
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function is the same as c() except that instead of using a
     *  name and an attributes object to create the child it uses an
     *  existing DOM element object.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    cnode (elem) {
        let impNode;
        const xmlGen = xmlGenerator();
        try {
            impNode = xmlGen.importNode !== undefined;
        } catch (e) {
            impNode = false;
        }
        const newElem = impNode ? xmlGen.importNode(elem, true) : copyElement(elem);
        this.node.appendChild(newElem);
        this.node = newElem;
        return this;
    }

    /** Function: t
     *  Add a child text element.
     *
     *  This *does not* make the child the new current element since there
     *  are no children of text elements.
     *
     *  Parameters:
     *    (String) text - The text data to append to the current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    t (text) {
        const child = xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    }

    /** Function: h
     *  Replace current element contents with the HTML passed in.
     *
     *  This *does not* make the child the new current element
     *
     *  Parameters:
     *    (String) html - The html to insert as contents of current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    h (html) {
        const fragment = xmlGenerator().createElement('body');
        // force the browser to try and fix any invalid HTML tags
        fragment.innerHTML = html;
        // copy cleaned html into an xml dom
        const xhtml = createHtml(fragment);
        while (xhtml.childNodes.length > 0) {
            this.node.appendChild(xhtml.childNodes[0]);
        }
        return this;
    }
}
