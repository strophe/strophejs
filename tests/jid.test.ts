import { Strophe } from '../dist/strophe.node.esm.js';
import { describe, it, expect } from 'vitest';

describe('JIDs', () => {
    it('Normal JID', () => {
        const jid = 'darcy@pemberley.lit/library';
        expect(Strophe.getNodeFromJid(jid)).toBe('darcy');
        expect(Strophe.getDomainFromJid(jid)).toBe('pemberley.lit');
        expect(Strophe.getResourceFromJid(jid)).toBe('library');
        expect(Strophe.getBareJidFromJid(jid)).toBe('darcy@pemberley.lit');
    });

    it('Weird node (unescaped)', () => {
        const jid = 'darcy@netherfield.lit@pemberley.lit/library';
        expect(Strophe.getNodeFromJid(jid)).toBe('darcy');
        expect(Strophe.getDomainFromJid(jid)).toBe('netherfield.lit@pemberley.lit');
        expect(Strophe.getResourceFromJid(jid)).toBe('library');
        expect(Strophe.getBareJidFromJid(jid)).toBe('darcy@netherfield.lit@pemberley.lit');
    });

    it('Weird node (escaped)', () => {
        const escapedNode = Strophe.escapeNode('darcy@netherfield.lit');
        const jid = escapedNode + '@pemberley.lit/library';
        expect(Strophe.getNodeFromJid(jid)).toBe('darcy\\40netherfield.lit');
        expect(Strophe.getDomainFromJid(jid)).toBe('pemberley.lit');
        expect(Strophe.getResourceFromJid(jid)).toBe('library');
        expect(Strophe.getBareJidFromJid(jid)).toBe('darcy\\40netherfield.lit@pemberley.lit');
    });

    it('Weird resource', () => {
        const jid = 'books@chat.pemberley.lit/darcy@pemberley.lit/library';
        expect(Strophe.getNodeFromJid(jid)).toBe('books');
        expect(Strophe.getDomainFromJid(jid)).toBe('chat.pemberley.lit');
        expect(Strophe.getResourceFromJid(jid)).toBe('darcy@pemberley.lit/library');
        expect(Strophe.getBareJidFromJid(jid)).toBe('books@chat.pemberley.lit');
    });
});
