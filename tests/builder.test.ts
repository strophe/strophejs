import { Strophe, $build, $msg, $pres, stx } from '../dist/strophe.node.esm.js';
import { isEqualNode } from './helpers.js';
import { describe, it, expect, vi } from 'vitest';

describe('Builder', () => {
    it('The root() method', () => {
        const builder = new Strophe.Builder('root');
        const el = builder.c('child').c('grandchild').c('greatgrandchild').root();
        expect(el.node.nodeName).toBe('root');
    });

    it('The h() method parses XHTML-IM markup and drops disallowed tags', () => {
        // h() relies on the innerHTML setter to parse markup; in the Node build
        // that is backed by the @xmldom/xmldom-based DOM shim. Well-formed XHTML
        // is kept and filtered to the XHTML-IM whitelist, so <p>/<strong> survive
        // while <script> is dropped.
        const el = new Strophe.Builder('body', { xmlns: Strophe.NS.XHTML_IM })
            .h('<p>Hello <strong>world</strong></p><script>alert(1)</script>')
            .tree();
        const p = el.getElementsByTagName('p')[0];
        expect(p).toBeTruthy();
        expect(p.textContent).toBe('Hello world');
        expect(p.getElementsByTagName('strong')[0].textContent).toBe('world');
        expect(el.getElementsByTagName('script').length).toBe(0);
    });

    it('Correct namespace (#32)', () => {
        const stanzas = [
            new Strophe.Builder('message', { foo: 'asdf' }).tree(),
            $build('iq', {}).tree(),
            $pres().tree(),
        ];
        stanzas.forEach((s) => expect(s.getAttribute('xmlns')).toBe(Strophe.NS.CLIENT));
    });

    it('Strophe.Connection.prototype.send() accepts Builders (#27)', () => {
        const stanza = $pres();
        const conn = new Strophe.Connection('');
        const sendStub = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
        const timeoutStub = vi.spyOn(globalThis as any, 'setTimeout').mockImplementation((func: () => void) => func());
        conn.send(stanza);
        expect(sendStub).toHaveBeenCalled();
        sendStub.mockRestore();
        timeoutStub.mockRestore();
    });

    it('The fromString static method', () => {
        const stanza = Strophe.Builder.fromString(
            '<presence from="juliet@example.com/chamber" xmlns="jabber:client"></presence>',
        );
        expect(isEqualNode(stanza, $pres({ from: 'juliet@example.com/chamber' }))).toBe(true);
    });
});

describe('A character a Builder cannot carry', () => {
    // Written with fromCharCode so the source of this file stays free of the
    // control characters under test. Nothing parses a tree built this way, on
    // its way in or on its way out, so creation is the only chance to refuse
    // text which would kill the stream.
    const ch = (code: number) => String.fromCharCode(code);
    const NUL = ch(0);

    it('refuses one in a text node, however the text node was asked for', () => {
        expect(() =>
            $msg()
                .c('body')
                .t('a' + NUL + 'b'),
        ).toThrow(/A text node holds U\+0000 at index 1/);
        expect(() => $msg().c('body', {}, 'a' + NUL + 'b')).toThrow(/A text node holds U\+0000 at index 1/);
        expect(() => Strophe.xmlTextNode('a' + NUL + 'b')).toThrow(/A text node holds U\+0000 at index 1/);
        expect(() => Strophe.xmlElement('body', {}, 'a' + NUL + 'b')).toThrow(/A text node holds U\+0000/);
    });

    it('refuses one in an attribute, and says which attribute', () => {
        // The Builder constructor only remembers its attributes, so the check
        // runs when the tree is first asked for rather than at $msg().
        expect(() => $msg({ id: 'a' + NUL + 'b' }).tree()).toThrow(/The "id" attribute holds U\+0000 at index 1/);
        expect(() => $msg().attrs({ to: NUL })).toThrow(/The "to" attribute holds U\+0000 at index 0/);
        expect(() => Strophe.xmlElement('x', [['id', 'a' + NUL]])).toThrow(/The "id" attribute holds U\+0000/);
    });

    it('normalises line endings the way the stx path does', () => {
        // Both APIs now agree with what the recipient's parser will produce.
        const built = $msg()
            .c('body')
            .t('a' + ch(13) + ch(10) + 'b')
            .tree();
        expect(Strophe.serialize(built)).toBe('<message xmlns="jabber:client"><body>a\nb</body></message>');
        expect(
            Strophe.serialize(
                stx`<message xmlns="jabber:client"><body>${'a' + ch(13) + ch(10) + 'b'}</body></message>`.tree(),
            ),
        ).toBe(Strophe.serialize(built));
    });

    it('writes the whitespace an attribute holds as a character reference', () => {
        // Normalising the line endings of an attribute buys nothing on its own.
        // A parser normalises the whitespace in an attribute value as well, so
        // a line feed written literally is read back as a space and the sender
        // is left holding a different stanza from everyone it sent it to. A
        // character reference is the only way an attribute can carry one.
        const built = $msg({ id: 'a' + ch(13) + ch(10) + 'b', subject: 'x' + ch(9) + 'y' }).tree();
        expect(Strophe.serialize(built)).toBe('<message id="a&#xA;b" subject="x&#x9;y" xmlns="jabber:client"/>');

        // Which is what makes the tree the recipient parses the sender's own.
        const received = Strophe.toElement(Strophe.serialize(built));
        expect(received.getAttribute('id')).toBe('a\nb');
        expect(received.getAttribute('subject')).toBe('x\ty');

        // Element content needs none of it: a parser leaves the whitespace
        // between tags as it stands, so escaping it there would only be noise.
        expect(Strophe.serialize($msg().c('body').t('a\tb').tree())).toBe(
            '<message xmlns="jabber:client"><body>a\tb</body></message>',
        );
    });

    it('agrees with the stx path about an attribute, as it does about a text node', () => {
        // `stx` escapes the whitespace of a value interpolated into an attribute
        // for the same reason, since the value goes through the parser on its
        // way into the tree. Normalising the line endings here is what makes the
        // two land on the same string rather than on a CRLF and a line feed.
        const value = 'a' + ch(13) + ch(10) + 'b' + ch(9) + 'c';
        const built = $msg({ id: value }).tree();
        const templated = stx`<message xmlns="jabber:client" id="${value}"/>`.tree();

        expect(templated.getAttribute('id')).toBe(built.getAttribute('id'));
        expect(Strophe.serialize(templated)).toBe(Strophe.serialize(built));
    });

    it('carries everything XML does allow', () => {
        const emoji = String.fromCodePoint(0x1f600);
        const el = $msg({ id: 'x' })
            .c('body')
            .t('a\tb ' + emoji)
            .tree();
        expect(Strophe.serialize(el)).toBe(
            '<message id="x" xmlns="jabber:client"><body>a\tb ' + emoji + '</body></message>',
        );
    });
});
