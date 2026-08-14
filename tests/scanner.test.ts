import { describe, it, expect } from 'vitest';
import { Cursor, EXHAUSTED, newCursor, scan, scanDelimited, scanTag, scanText } from '../src/stanza';

/**
 * The cursor reads the template text a run at a time, one step ahead of the
 * parser, to work out where each interpolated value lands. Everything it does
 * is otherwise only reachable through a whole stanza, so these go at it
 * directly: hand it a string and a cursor, and read the cursor afterwards.
 */
describe('The template scanner', () => {
    const cursor = (over: Partial<Cursor> = {}): Cursor => ({ ...newCursor(), ...over });

    describe('scanText', () => {
        it('counts an element the tag opens', () => {
            const c = cursor();
            expect(scanText('<a>', 0, c)).toBe(1);
            expect(c).toMatchObject({ mode: 'tag', element: true, depth: 1, prev: '' });
        });

        it('counts an element the tag closes', () => {
            const c = cursor({ depth: 1 });
            expect(scanText('</a>', 0, c)).toBe(1);
            expect(c).toMatchObject({ mode: 'tag', element: true, depth: 0 });
        });

        it('counts nothing for a processing instruction or a declaration', () => {
            const pi = cursor({ depth: 1 });
            expect(scanText('<?pi data?>', 0, pi)).toBe(1);
            expect(pi).toMatchObject({ mode: 'tag', element: false, depth: 1 });

            const decl = cursor({ depth: 1 });
            expect(scanText('<!DOCTYPE x>', 0, decl)).toBe(1);
            expect(decl).toMatchObject({ mode: 'tag', element: false, depth: 1 });
        });

        it('hands a comment and a CDATA section over whole', () => {
            const comment = cursor();
            // Past `<!--`, so the opener cannot be read as the close as well.
            expect(scanText('<!-- x -->', 0, comment)).toBe(4);
            expect(comment).toMatchObject({ mode: 'comment', depth: 0 });

            const cdata = cursor();
            expect(scanText('<![CDATA[x]]>', 0, cdata)).toBe(9);
            expect(cdata).toMatchObject({ mode: 'cdata', depth: 0 });
        });

        it('skips the text before the tag', () => {
            const c = cursor();
            expect(scanText('hello <b>', 0, c)).toBe(7);
            expect(c).toMatchObject({ mode: 'tag', depth: 1 });
        });

        it('runs out where the text holds no tag at all', () => {
            const c = cursor();
            expect(scanText('just text', 0, c)).toBe(EXHAUSTED);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });

        it('reads a `<` at the very end of the run as opening an element', () => {
            // There is nothing after it to say otherwise, and the run which
            // follows carries on inside the tag. This is what a template naming
            // an element with a value relies on: `<${name}/>` arrives as a run
            // ending in `<`, and the `/>` in a later run takes the depth back
            // down again.
            const c = cursor();
            expect(scanText('a<', 0, c)).toBe(2);
            expect(c).toMatchObject({ mode: 'tag', element: true, depth: 1 });
        });

        it('forgets the character before the tag it just opened', () => {
            // `prev` spots a self-closing tag, so it must not carry anything
            // from before the tag into it.
            const c = cursor({ prev: '/' });
            scanText('<a>', 0, c);
            expect(c.prev).toBe('');
        });
    });

    describe('scanTag', () => {
        const inTag = (over: Partial<Cursor> = {}) => cursor({ mode: 'tag', element: true, depth: 1, ...over });

        it('leaves the tag at the `>`', () => {
            const c = inTag({ prev: 'a' });
            expect(scanTag('>', 0, c)).toBe(1);
            expect(c).toMatchObject({ mode: 'text', depth: 1, prev: '>' });
        });

        it('takes the depth back down for a self-closing tag', () => {
            const c = inTag({ prev: '/' });
            scanTag('>', 0, c);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });

        it('does not take it down for a processing instruction ending in `?>`', () => {
            const c = inTag({ element: false, prev: '?' });
            scanTag('>', 0, c);
            expect(c).toMatchObject({ mode: 'text', depth: 1 });
        });

        it('opens and closes an attribute value', () => {
            const c = inTag();
            scanTag('"', 0, c);
            expect(c.quote).toBe('"');

            scanTag('"', 0, c);
            expect(c.quote).toBe('');
        });

        it('reads a `>` inside an attribute value as content', () => {
            const c = inTag({ quote: '"' });
            scanTag('>', 0, c);
            expect(c).toMatchObject({ mode: 'tag', quote: '"' });
        });

        it('reads the other quote character inside an attribute value as content', () => {
            const c = inTag({ quote: '"' });
            scanTag("'", 0, c);
            expect(c.quote).toBe('"');
        });

        it('does not end an element on a `/` inside an attribute value', () => {
            // `<a id="x/"/>`: only the `/` outside the quotes closes it.
            const c = inTag({ quote: '"' });
            scanTag('/', 0, c);
            expect(c.prev).toBe('/');

            scanTag('"', 0, c);
            expect(c.quote).toBe('');
            // `prev` is now the quote, so the `>` which follows closes nothing.
            scanTag('>', 0, c);
            expect(c).toMatchObject({ mode: 'text', depth: 1 });
        });

        it('reads from the index it is given', () => {
            const c = inTag({ prev: '/' });
            expect(scanTag('ab>', 2, c)).toBe(3);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });
    });

    describe('scanDelimited', () => {
        it('reads a comment to its close', () => {
            const c = cursor({ mode: 'comment' });
            expect(scanDelimited('x --> y', 0, c)).toBe(5);
            expect(c.mode).toBe('text');
        });

        it('reads a CDATA section to its close', () => {
            const c = cursor({ mode: 'cdata' });
            expect(scanDelimited('x ]]> y', 0, c)).toBe(5);
            expect(c.mode).toBe('text');
        });

        it('stays where it is where the close is in a later run', () => {
            const c = cursor({ mode: 'comment' });
            expect(scanDelimited('still going', 0, c)).toBe(EXHAUSTED);
            expect(c.mode).toBe('comment');
        });

        it('takes only its own close for the close', () => {
            // A CDATA section may hold `-->`, and a comment may hold `]]>`.
            const cdata = cursor({ mode: 'cdata' });
            expect(scanDelimited('a --> b', 0, cdata)).toBe(EXHAUSTED);
            expect(cdata.mode).toBe('cdata');

            const comment = cursor({ mode: 'comment' });
            expect(scanDelimited('a ]]> b', 0, comment)).toBe(EXHAUSTED);
            expect(comment.mode).toBe('comment');
        });
    });

    describe('scan', () => {
        it('counts the elements a run leaves open', () => {
            const c = newCursor();
            scan('<message xmlns="jabber:client"><body>', c);
            expect(c).toMatchObject({ mode: 'text', depth: 2 });
        });

        it('takes a self-closing element back down again', () => {
            const c = newCursor();
            scan('<message><a/><b/></message>', c);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });

        it('reads a comment and a CDATA section without counting what is in them', () => {
            const c = newCursor();
            scan('<m><!-- <a><b> --><![CDATA[<c><d>]]></m>', c);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });

        /**
         * A template is read a run at a time, one per static part and one per
         * value written into the text, so a construct may begin in one run and
         * end in another. This is the state the cursor exists to carry, and
         * nothing else reaches it.
         */
        describe('across runs', () => {
            it('carries a tag which a later run closes', () => {
                const c = newCursor();
                scan('<message ', c);
                expect(c).toMatchObject({ mode: 'tag', depth: 1 });

                scan('to="juliet@capulet.lit">', c);
                expect(c).toMatchObject({ mode: 'text', depth: 1 });
            });

            it('carries an attribute value which a later run closes', () => {
                const c = newCursor();
                scan('<message id="', c);
                expect(c).toMatchObject({ mode: 'tag', quote: '"' });

                // The `>` inside the value is content, and the tag ends at the
                // one after the closing quote.
                scan('a>b">', c);
                expect(c).toMatchObject({ mode: 'text', quote: '', depth: 1 });
            });

            it('carries a comment which a later run closes', () => {
                const c = newCursor();
                scan('<message><!-- <body>', c);
                expect(c).toMatchObject({ mode: 'comment', depth: 1 });

                scan(' --><body>', c);
                expect(c).toMatchObject({ mode: 'text', depth: 2 });
            });

            it('carries a CDATA section which a later run closes', () => {
                const c = newCursor();
                scan('<message><![CDATA[<body>', c);
                expect(c).toMatchObject({ mode: 'cdata', depth: 1 });

                scan(']]></message>', c);
                expect(c).toMatchObject({ mode: 'text', depth: 0 });
            });

            it('carries a tag whose name a later run supplies', () => {
                // `stx`<${unsafeXML('composing')}/>`` splits exactly here.
                const c = newCursor();
                scan('<', c);
                expect(c).toMatchObject({ mode: 'tag', depth: 1 });

                scan('composing', c);
                scan('/>', c);
                expect(c).toMatchObject({ mode: 'text', depth: 0 });
            });
        });

        it('reads an empty run without moving', () => {
            const c = newCursor();
            scan('', c);
            expect(c).toMatchObject({ mode: 'text', depth: 0 });
        });
    });
});
