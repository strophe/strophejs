import { Strophe, $iq, $msg, stx } from '../dist/strophe.node.esm.js';
import { describe, it, expect, vi } from 'vitest';

describe('XML', () => {
    it('XML escaping test', () => {
        const text = 's & p';
        const textNode = Strophe.xmlTextNode(text);
        expect(Strophe.getText(textNode)).toBe('s &amp; p');
        const text0 = 's < & > p';
        const textNode0 = Strophe.xmlTextNode(text0);
        expect(Strophe.getText(textNode0)).toBe('s &lt; &amp; &gt; p');
        const text1 = 's\'s or "p"';
        const textNode1 = Strophe.xmlTextNode(text1);
        expect(Strophe.getText(textNode1)).toBe('s&apos;s or &quot;p&quot;');
        const text2 = '<![CDATA[<foo>]]>';
        const textNode2 = Strophe.xmlTextNode(text2);
        expect(Strophe.getText(textNode2)).toBe('&lt;![CDATA[&lt;foo&gt;]]&gt;');
        const text3 = '<![CDATA[]]]]><![CDATA[>]]>';
        const textNode3 = Strophe.xmlTextNode(text3);
        expect(Strophe.getText(textNode3)).toBe('&lt;![CDATA[]]]]&gt;&lt;![CDATA[&gt;]]&gt;');
        const text4 = '&lt;foo&gt;<![CDATA[<foo>]]>';
        const textNode4 = Strophe.xmlTextNode(text4);
        expect(Strophe.getText(textNode4)).toBe('&amp;lt;foo&amp;gt;&lt;![CDATA[&lt;foo&gt;]]&gt;');
    });

    it('XML element creation', () => {
        let el = Strophe.xmlElement('message');
        expect(el.tagName).toBe('message');

        el = Strophe.xmlElement('message', 'Some text');
        expect(el.textContent).toBe('Some text');

        el = Strophe.xmlElement('message', {}, 'Some text');
        expect(el.textContent).toBe('Some text');

        el = Strophe.xmlElement('message', { foo: 'bar' }, 'Some text');
        expect(el.textContent).toBe('Some text');
        expect(el.getAttribute('foo')).toBe('bar');

        el = Strophe.xmlElement('message', [['foo', 'bar']], 'Some text');
        expect(el.textContent).toBe('Some text');
        expect(el.getAttribute('foo')).toBe('bar');
    });

    it('getNamespace resolves the namespace across DOM shapes', () => {
        // Strophe-built stanza: namespace is in the xmlns attribute only,
        // namespaceURI is null (xmlElement uses createElement, not NS-aware).
        const built = $iq({ type: 'get' }).tree();
        expect(built.getAttribute('xmlns')).toBe('jabber:client');
        expect(built.namespaceURI).toBeNull();
        expect(Strophe.getNamespace(built)).toBe('jabber:client');

        // DOMParser shape (WebSocket/BOSH): the xmlns attribute is present.
        const parsed = new DOMParser().parseFromString(
            "<pubsub xmlns='http://jabber.org/protocol/pubsub'/>",
            'text/xml',
        ).documentElement;
        expect(Strophe.getNamespace(parsed)).toBe('http://jabber.org/protocol/pubsub');

        // Component-transport shape: built with createElementNS, so the
        // namespace lives only on namespaceURI and there is no xmlns attribute.
        const nsOnly = Strophe.xmlGenerator().createElementNS('http://jabber.org/protocol/pubsub', 'pubsub');
        expect(nsOnly.getAttribute('xmlns')).toBeNull();
        expect(nsOnly.namespaceURI).toBe('http://jabber.org/protocol/pubsub');
        expect(Strophe.getNamespace(nsOnly)).toBe('http://jabber.org/protocol/pubsub');

        // No namespace at all.
        expect(Strophe.getNamespace(Strophe.xmlElement('foo'))).toBeNull();
    });

    it('copyElement() double escape bug', () => {
        const cloned = Strophe.copyElement(Strophe.xmlGenerator().createTextNode('<>&lt;&gt;'));
        expect(cloned.nodeValue).toBe('<>&lt;&gt;');
    });

    it('XML serializing', () => {
        const parser = new DOMParser();
        // Attributes
        const element1 = parser.parseFromString("<foo attr1='abc' attr2='edf'>bar</foo>", 'text/xml').documentElement;
        expect(Strophe.serialize(element1)).toBe('<foo attr1="abc" attr2="edf">bar</foo>');
        const element2 = parser.parseFromString('<foo attr1="abc" attr2="edf">bar</foo>', 'text/xml').documentElement;
        expect(Strophe.serialize(element2)).toBe('<foo attr1="abc" attr2="edf">bar</foo>');
        const element3 = parser.parseFromString(
            '<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>',
            'text/xml',
        ).documentElement;
        expect(Strophe.serialize(element3)).toBe('<foo>a &gt; &apos;b&apos; &amp; &quot;b&quot; &lt; c</foo>');
        const element4 = parser.parseFromString(
            "<foo attr='&lt;a> &apos;b&apos;'>bar</foo>",
            'text/xml',
        ).documentElement;
        expect(Strophe.serialize(element4)).toBe('<foo attr="&lt;a&gt; &apos;b&apos;">bar</foo>');
        const element5 = parser.parseFromString(
            '<foo attr="&lt;a> &quot;b&quot;">bar</foo>',
            'text/xml',
        ).documentElement;
        expect(Strophe.serialize(element5)).toBe('<foo attr="&lt;a&gt; &quot;b&quot;">bar</foo>');
        const element6 = parser.parseFromString('<foo><empty></empty></foo>', 'text/xml').documentElement;
        expect(Strophe.serialize(element6)).toBe('<foo><empty/></foo>');
        const element7 = parser.parseFromString(
            '<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>',
            'text/xml',
        ).documentElement;
        expect(Strophe.serialize(element7)).toBe('<foo><bar>a</bar><baz><wibble>b</wibble></baz></foo>');
        const element8 = parser.parseFromString(
            '<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>',
            'text/xml',
        ).documentElement;
        expect(Strophe.serialize(element8)).toBe('<foo><bar>a</bar><baz>b<wibble>c</wibble>d</baz></foo>');
        const element9 = parser.parseFromString('<foo><![CDATA[<foo>]]></foo>', 'text/xml').documentElement;
        expect(Strophe.serialize(element9)).toBe('<foo><![CDATA[<foo>]]></foo>');
        const element10 = parser.parseFromString('<foo><![CDATA[]]]]><![CDATA[>]]></foo>', 'text/xml').documentElement;
        expect(Strophe.serialize(element10)).toBe('<foo><![CDATA[]]]]><![CDATA[>]]></foo>');
        const element11 = parser.parseFromString('<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>', 'text/xml').documentElement;
        expect(Strophe.serialize(element11)).toBe('<foo>&lt;foo&gt;<![CDATA[<foo>]]></foo>');
    });

    describe('toElement', () => {
        // The namespace check is shared with the one stx runs when it builds a
        // stanza, so what one accepts the other accepts.
        it('accepts a stanza in either of the stanza namespaces', () => {
            expect(Strophe.toElement('<message xmlns="jabber:client"/>', true).nodeName).toBe('message');
            expect(Strophe.toElement('<iq xmlns="jabber:server"/>', true).nodeName).toBe('iq');
        });

        it('leaves an element which is not a stanza to its own namespace', () => {
            expect(Strophe.toElement('<query xmlns="jabber:iq:roster"/>', true).nodeName).toBe('query');
        });

        it('rejects a stanza in neither, as stx does', () => {
            expect(() => Strophe.toElement('<presence xmlns="wrong"/>', true)).toThrow(/Invalid namespaceURI wrong/);
            expect(() => stx`<presence xmlns="wrong"/>`.tree()).toThrow(/Invalid namespaceURI wrong/);
        });

        it('only logs the wrong namespace when it was not asked to throw', () => {
            const error = vi.spyOn(console, 'error').mockImplementation(() => {});
            expect(Strophe.toElement('<presence xmlns="wrong"/>').nodeName).toBe('presence');
            expect(error).toHaveBeenCalledWith('Invalid namespaceURI wrong');
            error.mockRestore();
        });
    });

    describe('stripWhitespace', () => {
        const el = (xml: string) => Strophe.xmlHtmlNode(xml).firstElementChild;
        const XHTML = Strophe.NS.XHTML;
        const XHTML_IM = Strophe.NS.XHTML_IM;

        it('removes the whitespace between the tags of an element', () => {
            expect(Strophe.serialize(Strophe.stripWhitespace(el('<subject>\n  <p>a</p>\n</subject>')))).toBe(
                '<subject><p>a</p></subject>',
            );
        });

        it('leaves an XHTML-IM body alone whether it is passed in or reached through the tree', () => {
            // The whitespace between inline XHTML elements separates words, so
            // it is content. The exemption applies to the element it is given
            // and not only to that element's children, so the body keeps its
            // whitespace either way it is arrived at.
            const body = `<body xmlns="${XHTML}">\n  <em>a</em> <em>b</em>\n</body>`;
            expect(Strophe.serialize(Strophe.stripWhitespace(el(body)))).toBe(body);

            const message = `<message xmlns="jabber:client">\n  <html xmlns="${XHTML_IM}">\n    ${body}\n  </html>\n</message>`;
            expect(Strophe.serialize(Strophe.stripWhitespace(el(message)))).toBe(
                `<message xmlns="jabber:client"><html xmlns="${XHTML_IM}">${body}</html></message>`,
            );
        });

        it('leaves an XHTML-IM body alone when the stanza was built rather than parsed', () => {
            // Builder makes its elements with createElement, so their namespace
            // lives in the xmlns attribute and namespaceURI is null. Reading
            // namespaceURI alone would miss the exemption for every locally
            // built stanza and run "a" and "b" together.
            const built = $msg()
                .c('html', { xmlns: XHTML_IM })
                .c('body', { xmlns: XHTML })
                .c('em', {}, 'a')
                .t(' ')
                .c('em', {}, 'b')
                .tree();

            const body = built.getElementsByTagName('body')[0];
            expect(body.namespaceURI).toBeNull();
            expect(Strophe.getNamespace(body)).toBe(XHTML);

            expect(Strophe.serialize(Strophe.stripWhitespace(built))).toBe(
                `<message xmlns="jabber:client"><html xmlns="${XHTML_IM}">` +
                    `<body xmlns="${XHTML}"><em>a</em> <em>b</em></body></html></message>`,
            );
        });

        it('strips a <body> which is not the XHTML one', () => {
            // The exemption is for XHTML-IM. An element which only shares the
            // name is a different thing: a plain-text body holds text rather
            // than markup, and its text is kept by the single-child rule
            // whatever happens here, while a BOSH body is a wrapper whose
            // layout is nobody's content.
            expect(
                Strophe.serialize(
                    Strophe.stripWhitespace(el('<message xmlns="jabber:client">\n  <body>hi</body>\n</message>')),
                ),
            ).toBe('<message xmlns="jabber:client"><body>hi</body></message>');

            const bosh = '<body xmlns="http://jabber.org/protocol/httpbind">\n  <message xmlns="jabber:client"/>\n</body>';
            expect(Strophe.serialize(Strophe.stripWhitespace(el(bosh)))).toBe(
                '<body xmlns="http://jabber.org/protocol/httpbind"><message xmlns="jabber:client"/></body>',
            );
        });

        it('lets an XHTML-IM body opt out of its own exemption with xml:space="default"', () => {
            // The exemption is a guess about what the markup is for, so an
            // explicit xml:space outranks it in both directions.
            expect(
                Strophe.serialize(
                    Strophe.stripWhitespace(el(`<body xmlns="${XHTML}" xml:space="default">\n  <p>a</p>\n</body>`)),
                ),
            ).toBe(`<body xml:space="default" xmlns="${XHTML}"><p>a</p></body>`);
        });

        it('leaves an element marked xml:space="preserve" alone when passed in', () => {
            expect(Strophe.serialize(Strophe.stripWhitespace(el('<x xml:space="preserve">\n  <p/>\n</x>')))).toBe(
                '<x xml:space="preserve">\n  <p/>\n</x>',
            );
        });

        it('strips in place and returns the element it was given', () => {
            const element = el('<subject>\n  <p>a</p>\n</subject>');
            expect(Strophe.stripWhitespace(element)).toBe(element);
            expect(Strophe.serialize(element)).toBe('<subject><p>a</p></subject>');
        });
    });
});

describe('The Node DOM shim', () => {
    // Written with fromCharCode so the source of this file stays free of the
    // control characters under test. @xmldom/xmldom reports nothing at all for
    // them and hands the text back with the character still in it, where a
    // browser refuses the document, so the shim has to refuse it instead.
    const ch = (code: number) => String.fromCharCode(code);
    const NUL = ch(0);

    it('refuses a character XML cannot represent, as a browser does', () => {
        const doc = Strophe.xmlHtmlNode('<c>a' + NUL + 'b</c>');
        expect(Strophe.getParserError(doc)).toMatch(/disallowed character U\+0000 at index 4/);

        expect(() => Strophe.toElement('<message xmlns="jabber:client"><body>' + NUL + '</body></message>')).toThrow(
            /Parser Error: disallowed character U\+0000/,
        );
    });

    it('catches a value an stx template wrote into its text rather than stood in for', () => {
        // Inside a comment or a CDATA section, and at document level, a value
        // is written into the template and read by the parser. Element content
        // and an attribute value are checked by stanza.ts on their own, the one
        // because it gets a slot and the other because its whitespace has to be
        // escaped before the parser sees it.
        expect(() => stx`<message xmlns="jabber:client"><c><![CDATA[${NUL}]]></c></message>`.tree()).toThrow(
            /disallowed character U\+0000/,
        );

        const wholeStanza = Strophe.Stanza.unsafeXML(
            '<message xmlns="jabber:client"><body>' + NUL + '</body></message>',
        );
        expect(() => stx`${wholeStanza}`.tree()).toThrow(/disallowed character U\+0000/);
    });

    it('catches it in markup spliced into element content too', () => {
        // That value does get a slot, but its markup is parsed as a fragment,
        // so it arrives at the parser rather than at the text-node check.
        const spliced = Strophe.Stanza.unsafeXML('<b>' + NUL + '</b>');
        expect(() => stx`<message xmlns="jabber:client"><c>${spliced}</c></message>`.tree()).toThrow(
            /disallowed character U\+0000/,
        );
    });

    it('still parses everything XML does allow', () => {
        const emoji = String.fromCodePoint(0x1f600);
        const el = Strophe.toElement(
            '<message xmlns="jabber:client"><body>a\tb ' + emoji + ' ' + ch(0xfffd) + '</body></message>',
        );
        expect(el.getElementsByTagName('body')[0].textContent).toBe('a\tb ' + emoji + ' ' + ch(0xfffd));
    });

    it('leaves Builder.h() empty, the way it already does for malformed markup', () => {
        // h() goes through the innerHTML setter, which swallows a parse failure
        // rather than throwing, so the stanza simply carries no XHTML body.
        const el = new Strophe.Builder('body', { xmlns: Strophe.NS.XHTML_IM }).h('<p>a' + NUL + 'b</p>').tree();
        expect(el.childNodes.length).toBe(0);
    });
});

describe('adoptNode in the Node DOM shim', () => {
    // @xmldom/xmldom implements neither this nor firstElementChild. stx uses
    // it to move an interpolated fragment into the stanza rather than paying
    // for the deep copy importNode makes.
    it('moves a node into the document, children and all', () => {
        const target = Strophe.xmlHtmlNode('<iq xmlns="jabber:client"><fin/></iq>');
        const source = Strophe.xmlHtmlNode('<wrap xmlns="urn:x"><result><b>hi</b></result></wrap>');
        const node = source.documentElement.firstElementChild;

        const adopted = target.adoptNode(node);
        expect(adopted).toBe(node);
        expect(adopted.ownerDocument).toBe(target);
        expect(adopted.getElementsByTagName('b')[0].ownerDocument).toBe(target);
        expect(adopted.namespaceURI).toBe('urn:x');

        // Taken out of the document it came from, not shared with it.
        expect(source.documentElement.childNodes.length).toBe(0);

        target.documentElement.firstElementChild.appendChild(adopted);
        expect(Strophe.serialize(target.documentElement)).toBe(
            '<iq xmlns="jabber:client"><fin><result><b>hi</b></result></fin></iq>',
        );
    });
});
