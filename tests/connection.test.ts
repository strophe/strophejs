import { Strophe, $pres } from '../dist/strophe.node.esm.js';
import sinon from 'sinon';
import { describe, it, expect } from 'vitest';

describe('Strophe.Connection options', () => {
    it('withCredentials can be set on the XMLHttpRequest object', () => {
        const stanza = $pres();
        const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
        const timeoutStub = (sinon.stub(globalThis, 'setTimeout') as any).callsFake(function (func: () => void) {
            func.apply(arguments);
        });

        let conn = new Strophe.Connection('example.org');
        conn.send(stanza);
        expect(sendStub.called).toBe(true);
        expect(!!sendStub.getCalls()[0].thisValue.withCredentials).toBe(false);

        conn = new Strophe.Connection('example.org', { 'withCredentials': true });
        conn.send(stanza);
        expect(sendStub.called).toBe(true);
        expect(sendStub.getCalls()[1].thisValue.withCredentials).toBe(true);
        sendStub.restore();
        timeoutStub.restore();
    });

    it('content type can be set on the XMLHttpRequest object', () => {
        const stanza = $pres();
        const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
        const timeoutStub = (sinon.stub(globalThis, 'setTimeout') as any).callsFake(function (func: () => void) {
            func.apply(arguments);
        });
        const setRetRequestHeaderStub = sinon.stub(XMLHttpRequest.prototype, 'setRequestHeader');
        let conn = new Strophe.Connection('example.org');
        conn.send(stanza);
        expect(setRetRequestHeaderStub.getCalls()[0].args[0]).toBe('Content-Type');
        expect(setRetRequestHeaderStub.getCalls()[0].args[1]).toBe('text/xml; charset=utf-8');

        conn = new Strophe.Connection('example.org', { contentType: 'text/plain; charset=utf-8' });
        conn.send(stanza);
        expect(setRetRequestHeaderStub.getCalls()[1].args[0]).toBe('Content-Type');
        expect(setRetRequestHeaderStub.getCalls()[1].args[1]).toBe('text/plain; charset=utf-8');
        sendStub.restore();
        timeoutStub.restore();
        setRetRequestHeaderStub.restore();
    });

    it('Cookies can be added to the document passing them as options to Strophe.Connection', () => {
        if (typeof window === 'undefined') {
            console.warn("Skipping test since there's no 'window' object");
            return;
        }

        const stanza = $pres();
        let conn = new Strophe.Connection('http://localhost', {
            'cookies': {
                '_xxx': {
                    'value': '1234',
                    'path': '/',
                },
            },
        });
        expect(document.cookie.indexOf('_xxx')).not.toBe(-1);
        let start = document.cookie.indexOf('_xxx');
        let end = document.cookie.indexOf(';', start);
        end = end == -1 ? document.cookie.length : end;
        expect(document.cookie.substring(start, end)).toBe('_xxx=1234');

        conn = new Strophe.Connection('http://localhost', { 'cookies': { '_yyy': '4321' }, 'withCredentials': true });
        expect(document.cookie.indexOf('_yyy')).not.toBe(-1);
        start = document.cookie.indexOf('_yyy');
        end = document.cookie.indexOf(';', start);
        end = end == -1 ? document.cookie.length : end;
        expect(document.cookie.substring(start, end)).toBe('_yyy=4321');

        const sendStub = sinon.stub(XMLHttpRequest.prototype, 'send');
        const timeoutStub = (sinon.stub(globalThis, 'setTimeout') as any).callsFake(function (func: () => void) {
            func.apply(arguments);
        });
        conn.send(stanza);
        expect(sendStub.called).toBe(true);
        sendStub.restore();
        timeoutStub.restore();
    });

    it('send() does not accept strings', () => {
        const stanza = '<presence/>';
        const conn = new Strophe.Connection('');
        conn.connect_callback = () => {};
        let caughtError: any;
        try {
            conn.send(stanza as any);
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError?.name).toBe('StropheError');
    });

    it('Builder with XML attribute escaping test', () => {
        let text = '<b>';
        let expected = '<presence to="&lt;b&gt;" xmlns="jabber:client"/>';
        let pres = $pres({ to: text });
        expect(pres.toString()).toBe(expected);

        text = 'foo&bar';
        expected = '<presence to="foo&amp;bar" xmlns="jabber:client"/>';
        pres = $pres({ to: text });
        expect(pres.toString()).toBe(expected);
    });

    it('c() accepts text and passes it to xmlElement', () => {
        const pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' }).c(
            'nick',
            { xmlns: 'http://jabber.org/protocol/nick' },
            'Darcy',
        );
        const expected =
            '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
            '<nick xmlns="http://jabber.org/protocol/nick">Darcy</nick>' +
            '</presence>';
        expect(pres.toString()).toBe(expected);
    });

    it('c() return the child element if it is a text node.', () => {
        let pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' })
            .c('show', {}, 'dnd')
            .c('status', {}, 'In a meeting');

        let expected =
            '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
            '<show>dnd</show><status>In a meeting</status>' +
            '</presence>';
        expect(pres.toString()).toBe(expected);

        pres = $pres({ from: 'darcy@pemberley.lit', to: 'books@chat.pemberley.lit' })
            .c('show', {}, '')
            .c('status', {}, '');
        expected =
            '<presence from="darcy@pemberley.lit" to="books@chat.pemberley.lit" xmlns="jabber:client">' +
            '<show/><status/>' +
            '</presence>';
        expect(pres.toString()).toBe(expected);
    });
});
