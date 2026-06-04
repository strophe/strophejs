import { Strophe, $iq, $msg, stx } from '../dist/strophe.node.esm.js';
import sinon from 'sinon';
import { XHR, makeRequest } from './helpers.js';
import { describe, it, expect } from 'vitest';

describe('Handler', () => {
    it('HTTP errors', () => {
        const spy500 = sinon.spy();
        const spy401 = sinon.spy();
        const conn = new Strophe.Connection('http://fake');
        conn.addProtocolErrorHandler('HTTP', 500, spy500);
        conn.addProtocolErrorHandler('HTTP', 401, spy401);
        const req = new Strophe.Request('' as any, () => {}, 0);
        req.xhr = new XHR(200, 4) as unknown as XMLHttpRequest;
        (conn._proto as any)._onRequestStateChange(() => {}, req);
        expect(spy500.called).toBe(false);
        expect(spy401.called).toBe(false);

        req.xhr = new XHR(401, 4) as unknown as XMLHttpRequest;
        (conn._proto as any)._onRequestStateChange(() => {}, req);
        expect(spy500.called).toBe(false);
        expect(spy401.called).toBe(true);

        req.xhr = new XHR(500, 4) as unknown as XMLHttpRequest;
        (conn._proto as any)._onRequestStateChange(() => {}, req);
        expect(spy500.called).toBe(true);
    });

    it('IQ fallback handler', () => {
        // Strophe returns an IQ error stanza to unhandled incoming IQ get and set stanzas
        const conn = new Strophe.Connection('http://fake');
        conn.authenticated = true;
        const spy = sinon.spy(conn, 'send');

        conn._dataRecv(makeRequest($iq({ 'type': 'get', 'id': '1' }).tree()));
        expect(spy.calledOnce).toBe(true);
        expect(Strophe.serialize((spy.args[0][0] as any).nodeTree)).toBe(
            '<iq id="1" type="error" xmlns="jabber:client">' +
                '<error type="cancel"><service-unavailable xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></error>' +
                '</iq>',
        );

        conn._dataRecv(makeRequest($iq({ 'type': 'get', 'id': '2' }).tree()));
        expect(spy.calledTwice).toBe(true);
        expect(Strophe.serialize((spy.args[1][0] as any).nodeTree)).toBe(
            '<iq id="2" type="error" xmlns="jabber:client">' +
                '<error type="cancel"><service-unavailable xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></error>' +
                '</iq>',
        );

        // When there is a handler, then the fallback handler isn't called.
        const handlerStub = sinon.stub();
        handlerStub.returns(true);
        conn.addHandler(handlerStub, null, 'iq', null, null, null);

        conn._dataRecv(makeRequest($iq({ 'type': 'set' }).tree()));
        expect(spy.calledTwice).toBe(true);

        conn._dataRecv(makeRequest($iq({ 'type': 'get' }).tree()));
        expect(spy.calledTwice).toBe(true);

        expect(handlerStub.calledTwice).toBe(true);
    });

    it('Full JID matching', () => {
        const elem = $msg({ from: 'darcy@pemberley.lit/library' }).tree();

        let hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit/library');
        expect(hand.isMatch(elem)).toBe(true);

        hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit');
        expect(hand.isMatch(elem)).toBe(false);
    });

    it('Bare JID matching', () => {
        const elem = $msg({ from: 'darcy@pemberley.lit/library' }).tree();

        let hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit/library', {
            matchBareFromJid: true,
        });
        expect(hand.isMatch(elem)).toBe(true);

        hand = new Strophe.Handler(null, null, null, null, null, 'darcy@pemberley.lit', { matchBareFromJid: true });
        expect(hand.isMatch(elem)).toBe(true);
    });

    it('Namespace matching', () => {
        const elemNoFrag = $msg({ xmlns: 'http://jabber.org/protocol/muc' }).tree();
        const elemWithFrag = $msg({ xmlns: 'http://jabber.org/protocol/muc#user' }).tree();

        let hand = new Strophe.Handler(null, 'http://jabber.org/protocol/muc', null, null, null, null);
        expect(hand.isMatch(elemNoFrag)).toBe(true);
        expect(hand.isMatch(elemWithFrag)).toBe(false);

        const elemNested = stx`
        <iq type="error"
                xmlns="jabber:client"
                from="plays.shakespeare.lit"
                to="romeo@montague.net/orchard"
                id="info1">
            <query xmlns="http://jabber.org/protocol/disco#info"/>
            <error type="cancel">
                <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
            </error>
        </iq>`.tree();
        hand = new Strophe.Handler(null, 'urn:ietf:params:xml:ns:xmpp-stanzas');
        expect(hand.isMatch(elemNested)).toBe(true);
        expect(hand.isMatch(elemNoFrag)).toBe(false);

        hand = new Strophe.Handler(null, 'http://jabber.org/protocol/muc', null, null, null, null, {
            'ignoreNamespaceFragment': true,
        });
        expect(hand.isMatch(elemNoFrag)).toBe(true);
        expect(hand.isMatch(elemWithFrag)).toBe(true);
    });

    it('Stanza name matching', () => {
        const elem = $iq().tree();
        let hand = new Strophe.Handler(null, null, 'iq');
        expect(hand.isMatch(elem)).toBe(true);

        hand = new Strophe.Handler(null, null, 'message');
        expect(hand.isMatch(elem)).toBe(false);
    });

    it('Stanza type matching', () => {
        const elem = $iq({ type: 'error' }).tree();
        let hand = new Strophe.Handler(null, null, 'iq', 'error');
        expect(hand.isMatch(elem)).toBe(true);

        hand = new Strophe.Handler(null, null, 'iq', 'result');
        expect(hand.isMatch(elem)).toBe(false);

        hand = new Strophe.Handler(null, null, 'iq', ['error', 'result']);
        expect(hand.isMatch(elem)).toBe(true);
    });
});
