import { Strophe, $build, $pres } from '../dist/strophe.node.esm.js';
import { isEqualNode } from './helpers.js';
import { describe, it, expect, vi } from 'vitest';

describe('Builder', () => {
    it('The root() method', () => {
        const builder = new Strophe.Builder('root');
        const el = builder.c('child').c('grandchild').c('greatgrandchild').root();
        expect(el.node.nodeName).toBe('root');
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
