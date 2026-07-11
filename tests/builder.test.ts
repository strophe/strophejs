import { Strophe, $build, $pres } from '../dist/strophe.node.esm.js';
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
