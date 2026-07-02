import { StreamManagement, MemoryStorageBackend, SessionStorageBackend } from '../dist/strophe.node.esm.js';
import { describe, it, expect, vi, afterEach } from 'vitest';

const SM_NS = 'urn:xmpp:sm:3';

/**
 * Build a StanzaView the way an adapter would.
 */
function view(name: string, attrs: Record<string, string> = {}, serialized?: string) {
    return { name, attrs, serialized: serialized ?? `<${name}/>` };
}

/**
 * Create an engine with a capturing sendRaw and a memory backend.
 */
function make(options: Record<string, unknown> = {}) {
    const sent: string[] = [];
    const storage = new MemoryStorageBackend();
    const sm = new StreamManagement((data: string) => sent.push(data), { storage, ...options });
    return { sm, sent, storage };
}

/**
 * Drive an engine into an enabled session.
 */
function enable(sm: InstanceType<typeof StreamManagement>, enabledAttrs: Record<string, string> = {}) {
    sm.sendEnable('romeo@example.net/orchard');
    sm.onInbound(view('enabled', { id: 'some-long-sm-id', resume: 'true', ...enabledAttrs }));
}

describe('StreamManagement core', () => {
    describe('enabling', () => {
        it('is inert before <enable/> is sent', () => {
            const { sm, sent } = make();
            sm.trackOutbound(view('message', {}, '<message><body>hi</body></message>'));
            sm.onInbound(view('message'));
            sm.onInbound(view('r'));
            expect(sm.state.unacked.length).toBe(0);
            expect(sm.state.hIn).toBe(0);
            expect(sent.length).toBe(0);
        });

        it('emits <enable/> with resume and max', () => {
            const { sm, sent } = make({ max: 300 });
            sm.sendEnable('romeo@example.net/orchard');
            expect(sent).toEqual([`<enable xmlns="${SM_NS}" resume="true" max="300"/>`]);
            expect(sm.state.enableSent).toBe(true);
            expect(sm.state.enabled).toBe(false);
            expect(sm.boundJid).toBe('romeo@example.net/orchard');
        });

        it('omits resume when requestResume is false', () => {
            const { sm, sent } = make({ requestResume: false });
            sm.sendEnable('romeo@example.net/orchard');
            expect(sent).toEqual([`<enable xmlns="${SM_NS}"/>`]);
        });

        it('sends <enable/> at most once per session', () => {
            const { sm, sent } = make();
            sm.sendEnable('romeo@example.net/orchard');
            sm.sendEnable('romeo@example.net/orchard');
            expect(sent.length).toBe(1);
        });

        it('stores id/max/location/resumeSupported from <enabled/> and fires onEnabled', () => {
            const { sm } = make();
            const spy = vi.fn();
            sm.onEnabled = spy;
            sm.sendEnable('romeo@example.net/orchard');
            sm.onInbound(view('enabled', { id: 'abc', resume: '1', max: '600', location: '[::1]:5222' }));
            expect(sm.enabled).toBe(true);
            expect(sm.state.id).toBe('abc');
            expect(sm.state.max).toBe(600);
            expect(sm.state.location).toBe('[::1]:5222');
            expect(sm.state.resumeSupported).toBe(true);
            expect(spy).toHaveBeenCalledOnce();
        });

        it('ignores <enabled/> when <enable/> was not sent', () => {
            const { sm } = make();
            sm.onInbound(view('enabled', { id: 'abc', resume: 'true' }));
            expect(sm.enabled).toBe(false);
        });
    });

    describe('counter-start asymmetry (XEP-0198 §4 note)', () => {
        it('tracks outbound from enable-send, before <enabled/> arrives', () => {
            const { sm } = make();
            sm.sendEnable('romeo@example.net/orchard');
            sm.trackOutbound(view('message', {}, '<message><body>early</body></message>'));
            expect(sm.state.unacked.length).toBe(1);
        });

        it('does not count inbound until <enabled/> is received', () => {
            const { sm } = make();
            sm.sendEnable('romeo@example.net/orchard');
            sm.onInbound(view('message'));
            expect(sm.state.hIn).toBe(0);
            sm.onInbound(view('enabled', { id: 'abc', resume: 'true' }));
            sm.onInbound(view('message'));
            sm.onInbound(view('iq'));
            expect(sm.state.hIn).toBe(2);
        });
    });

    describe('counting and acks', () => {
        it('only counts iq/presence/message', () => {
            const { sm } = make();
            enable(sm);
            for (const name of ['iq', 'presence', 'message']) {
                sm.onInbound(view(name));
                sm.trackOutbound(view(name));
            }
            for (const name of ['open', 'close', 'features', 'challenge', 'r', 'a']) {
                sm.onInbound(view(name));
                sm.trackOutbound(view(name));
            }
            expect(sm.state.hIn).toBe(3);
            expect(sm.state.unacked.length).toBe(3);
        });

        it('answers <r/> with <a h=.../>', () => {
            const { sm, sent } = make();
            enable(sm);
            sm.onInbound(view('message'));
            sm.onInbound(view('message'));
            expect(sm.onInbound(view('r'))).toBe(true);
            expect(sent.at(-1)).toBe(`<a xmlns="${SM_NS}" h="2"/>`);
        });

        it('sendAck emits the current inbound count (final ack before close)', () => {
            const { sm, sent } = make();
            enable(sm);
            sm.onInbound(view('presence'));
            sm.sendAck();
            expect(sent.at(-1)).toBe(`<a xmlns="${SM_NS}" h="1"/>`);
        });

        it('trims the unacked queue on <a h=.../> and resets sinceLastAck', () => {
            const { sm } = make();
            enable(sm);
            sm.trackOutbound(view('message', {}, '<message>1</message>'));
            sm.trackOutbound(view('message', {}, '<message>2</message>'));
            sm.trackOutbound(view('message', {}, '<message>3</message>'));
            sm.onInbound(view('a', { h: '2' }));
            expect(sm.state.unacked.map((e: { stanza: string }) => e.stanza)).toEqual(['<message>3</message>']);
            expect(sm.state.hOutAcked).toBe(2);
            expect(sm.state.sinceLastAck).toBe(0);
        });

        it('clamps when the server acks more than was sent', () => {
            const { sm } = make();
            enable(sm);
            sm.trackOutbound(view('message', {}, '<message>1</message>'));
            sm.onInbound(view('a', { h: '10' }));
            expect(sm.state.unacked.length).toBe(0);
            expect(sm.state.hOutAcked).toBe(10);
        });

        it('handles the 2^32 wraparound in reconciliation', () => {
            const { sm } = make();
            enable(sm);
            sm.state.hOutAcked = 4294967294;
            sm.trackOutbound(view('message', {}, '<message>1</message>'));
            sm.trackOutbound(view('message', {}, '<message>2</message>'));
            sm.trackOutbound(view('message', {}, '<message>3</message>'));
            sm.onInbound(view('a', { h: '1' }));
            expect(sm.state.unacked.length).toBe(0);
            expect(sm.state.hOutAcked).toBe(1);
        });

        it('wraps the inbound counter at 2^32', () => {
            const { sm, sent } = make();
            enable(sm);
            sm.state.hIn = 4294967295;
            sm.onInbound(view('message'));
            expect(sm.state.hIn).toBe(0);
            sm.sendAck();
            expect(sent.at(-1)).toBe(`<a xmlns="${SM_NS}" h="0"/>`);
        });

        it('requests an ack every maxUnacked outbound stanzas', () => {
            const { sm, sent } = make({ maxUnacked: 3 });
            enable(sm);
            const countAckRequests = () => sent.filter((s) => s === `<r xmlns="${SM_NS}"/>`).length;
            for (let i = 0; i < 5; i++) sm.trackOutbound(view('message', {}, `<message>${i}</message>`));
            expect(countAckRequests()).toBe(1);
            sm.trackOutbound(view('message', {}, '<message>6</message>'));
            expect(countAckRequests()).toBe(2);
            sm.onInbound(view('a', { h: '6' }));
            for (let i = 0; i < 3; i++) sm.trackOutbound(view('message', {}, `<message>${7 + i}</message>`));
            expect(countAckRequests()).toBe(3);
        });

        it('never requests acks when maxUnacked is 0', () => {
            const { sm, sent } = make({ maxUnacked: 0 });
            enable(sm);
            for (let i = 0; i < 10; i++) sm.trackOutbound(view('message', {}, `<message>${i}</message>`));
            expect(sent.filter((s) => s === `<r xmlns="${SM_NS}"/>`).length).toBe(0);
        });
    });

    describe('resumption', () => {
        it('reports resumable state only when the server allowed resumption', () => {
            const { sm } = make();
            sm.sendEnable('romeo@example.net/orchard');
            sm.onInbound(view('enabled', { id: 'abc' }));
            expect(sm.hasResumableState()).toBe(false);
            const other = make().sm;
            enable(other);
            expect(other.hasResumableState()).toBe(true);
        });

        it('emits <resume/> with h and an escaped previd', () => {
            const { sm, sent } = make();
            sm.sendEnable('romeo@example.net/orchard');
            sm.onInbound(view('enabled', { id: 'ab"&<c', resume: 'true' }));
            sm.onInbound(view('message'));
            sm.sendResume();
            expect(sent.at(-1)).toBe(`<resume xmlns="${SM_NS}" h="1" previd="ab&quot;&amp;&lt;c"/>`);
        });

        it('on <resumed/> reconciles h, resends the remainder and keeps it queued', () => {
            const { sm, sent } = make();
            const spy = vi.fn();
            sm.onResumed = spy;
            enable(sm);
            sm.trackOutbound(view('message', {}, '<message>1</message>'));
            sm.trackOutbound(view('message', {}, '<message>2</message>'));
            sm.trackOutbound(view('message', {}, '<message>3</message>'));
            const before = sent.length;
            sm.onInbound(view('resumed', { h: '1', previd: 'some-long-sm-id' }));
            expect(sent.slice(before)).toEqual([
                '<message>2</message>',
                '<message>3</message>',
                `<r xmlns="${SM_NS}"/>`,
            ]);
            expect(sm.state.unacked.length).toBe(2);
            expect(sm.resumed).toBe(true);
            expect(sm.enabled).toBe(true);
            expect(spy).toHaveBeenCalledOnce();
        });

        it('ignores <resumed/> without resumable state', () => {
            const { sm } = make();
            sm.onInbound(view('resumed', { h: '1', previd: 'bogus' }));
            expect(sm.resumed).toBe(false);
        });
    });

    describe('failed resumption (queue salvage)', () => {
        it('trims by the h on <failed/>, resets state and clears storage', () => {
            const { sm, storage } = make();
            const spy = vi.fn();
            sm.onFailed = spy;
            sm.initialize('romeo@example.net');
            enable(sm);
            sm.onInbound(view('message'));
            sm.trackOutbound(view('message', {}, '<message>1</message>'));
            sm.trackOutbound(view('message', {}, '<message>2</message>'));
            expect(storage.load('strophe-sm:romeo@example.net')).not.toBeNull();
            sm.onInbound(view('failed', { h: '1' }, `<failed xmlns="${SM_NS}" h="1"/>`));
            expect(sm.state.enableSent).toBe(false);
            expect(sm.state.enabled).toBe(false);
            expect(sm.state.id).toBe(null);
            expect(sm.state.hIn).toBe(0);
            expect(sm.state.unacked.length).toBe(0);
            expect(storage.load('strophe-sm:romeo@example.net')).toBeNull();
            expect(spy).toHaveBeenCalledOnce();
        });

        it('resends the salvaged queue once a fresh session reaches <enabled/>', () => {
            const { sm, sent } = make();
            enable(sm);
            sm.trackOutbound(view('message', {}, '<message><body>lost?</body></message>'));
            sm.trackOutbound(view('iq', {}, '<iq type="set"/>'));
            sm.sendResume(); // a reconnect attempts to resume...
            sm.onInbound(view('failed', {})); // ...which the server refuses
            const before = sent.length;
            enable(sm);
            const resent = sent.slice(before + 1); // skip the <enable/> itself
            expect(resent.length).toBe(3);
            expect(resent[0]).toMatch(
                /^<message><body>lost\?<\/body><delay xmlns="urn:xmpp:delay" stamp=".+"\/><\/message>$/
            );
            expect(resent[1]).toBe('<iq type="set"/>'); // only messages are delay-stamped
            expect(resent[2]).toBe(`<r xmlns="${SM_NS}"/>`);
            expect(sm.state.unacked.length).toBe(2); // requeued on the new session, in wire order
        });

        it('does not salvage when a fresh <enable/> (not a <resume/>) is refused', () => {
            const { sm, sent } = make();
            enable(sm);
            // The stream is alive and bound; this stanza was delivered normally.
            sm.trackOutbound(view('message', {}, '<message><body>delivered</body></message>'));
            sm.onInbound(view('failed', {})); // the server refuses the <enable/>
            const before = sent.length;
            enable(sm); // a later fresh session
            // nothing is re-sent: re-sending a delivered stanza would duplicate it
            expect(sent.slice(before + 1)).toEqual([]);
            expect(sm.state.unacked.length).toBe(0);
        });
    });

    describe('resumePending', () => {
        it('is set by sendResume and cleared by <resumed/>', () => {
            const { sm } = make();
            enable(sm);
            expect(sm.resumePending).toBe(false);
            sm.sendResume();
            expect(sm.resumePending).toBe(true);
            sm.onInbound(view('resumed', { h: '0', previd: 'some-long-sm-id' }));
            expect(sm.resumePending).toBe(false);
        });

        it('is cleared by <failed/> and by reset()', () => {
            const { sm } = make();
            enable(sm);
            sm.sendResume();
            sm.onInbound(view('failed', {}));
            expect(sm.resumePending).toBe(false);
            enable(sm);
            sm.sendResume();
            sm.reset();
            expect(sm.resumePending).toBe(false);
        });
    });

    describe('delay stamping', () => {
        it('handles self-closing stanzas', () => {
            const { sm, sent } = make();
            enable(sm);
            sm.trackOutbound(view('message', {}, '<message to="x"/>'));
            sm.sendResume();
            sm.onInbound(view('failed', {}));
            enable(sm);
            expect(sent.find((s) => s.startsWith('<message to="x">'))).toMatch(
                /^<message to="x"><delay xmlns="urn:xmpp:delay" stamp=".+"\/><\/message>$/
            );
        });

        it('does not stamp twice', () => {
            const { sm, sent } = make();
            enable(sm);
            const stamped = '<message><delay xmlns="urn:xmpp:delay" stamp="2026-01-01T00:00:00.000Z"/></message>';
            sm.trackOutbound(view('message', {}, stamped));
            sm.sendResume();
            sm.onInbound(view('failed', {}));
            enable(sm);
            expect(sent.filter((s) => s === stamped).length).toBe(1);
        });
    });

    describe('persistence', () => {
        it('persists across engine instances (page reload scenario)', () => {
            const { sm, storage } = make();
            sm.initialize('Romeo@Example.Net/orchard'); // keyed by lowercased bare JID
            enable(sm);
            sm.onInbound(view('message'));
            sm.onInbound(view('message'));
            sm.trackOutbound(view('message', {}, '<message>unacked</message>'));

            const sent2: string[] = [];
            const sm2 = new StreamManagement((data: string) => sent2.push(data), { storage });
            sm2.initialize('romeo@example.net');
            expect(sm2.hasResumableState()).toBe(true);
            expect(sm2.state.hIn).toBe(2);
            expect(sm2.state.id).toBe('some-long-sm-id');
            expect(sm2.boundJid).toBe('romeo@example.net/orchard');
            sm2.sendResume();
            expect(sent2).toEqual([`<resume xmlns="${SM_NS}" h="2" previd="some-long-sm-id"/>`]);
            sm2.onInbound(view('resumed', { h: '0', previd: 'some-long-sm-id' }));
            expect(sent2.at(-2)).toBe('<message>unacked</message>');
        });

        it('does not persist without initialize()', () => {
            const { sm, storage } = make();
            enable(sm);
            sm.onInbound(view('message'));
            const sm2 = new StreamManagement(() => {}, { storage });
            sm2.initialize('romeo@example.net');
            expect(sm2.hasResumableState()).toBe(false);
        });

        it('reset() clears memory but not storage; clearPersistedState() clears storage', () => {
            const { sm, storage } = make();
            sm.initialize('romeo@example.net');
            enable(sm);
            sm.reset();
            expect(sm.enabled).toBe(false);
            expect(storage.load('strophe-sm:romeo@example.net')).not.toBeNull();
            sm.initialize('romeo@example.net');
            expect(sm.hasResumableState()).toBe(true);
            sm.clearPersistedState();
            expect(storage.load('strophe-sm:romeo@example.net')).toBeNull();
        });
    });

    describe('SessionStorageBackend', () => {
        afterEach(() => {
            delete (globalThis as any).sessionStorage;
        });

        it('throws when sessionStorage is unavailable', () => {
            expect(() => new SessionStorageBackend()).toThrow();
        });

        it('round-trips via a sessionStorage global', () => {
            const store = new Map<string, string>();
            (globalThis as any).sessionStorage = {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => store.set(k, v),
                removeItem: (k: string) => store.delete(k),
            };
            const backend = new SessionStorageBackend();
            const { sm } = make({ storage: backend });
            sm.initialize('romeo@example.net');
            enable(sm);
            expect(backend.load('strophe-sm:romeo@example.net').id).toBe('some-long-sm-id');
            backend.clear('strophe-sm:romeo@example.net');
            expect(backend.load('strophe-sm:romeo@example.net')).toBeNull();
        });
    });
});
