import { Strophe, $iq } from '../dist/strophe.node.esm.js';
import { describe, it, expect } from 'vitest';

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
});
