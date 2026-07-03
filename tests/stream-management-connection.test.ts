import { Strophe, $msg, MemoryStorageBackend } from '../dist/strophe.node.esm.js';
import { describe, it, expect } from 'vitest';

const SM_NS = 'urn:xmpp:sm:3';
const BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';
const { Status } = Strophe;

function parse(xml: string): Element {
    return new DOMParser().parseFromString(xml, 'text/xml').documentElement;
}

/**
 * Nonzas on the wire are re-serialized from parsed Elements, so attribute
 * order isn't stable — match them semantically instead of by string.
 */
function isNonza(s: string | undefined, name: string, attrs: Record<string, string> = {}): boolean {
    if (!s || !s.startsWith(`<${name}`)) return false;
    const el = parse(s);
    return (
        el.tagName === name &&
        el.getAttribute('xmlns') === SM_NS &&
        Object.entries(attrs).every(([k, v]) => el.getAttribute(k) === v)
    );
}

/**
 * A websocket connection with a stubbed socket that records the wire.
 */
function makeConn(options: Record<string, unknown> = {}) {
    const wire: string[] = [];
    const statuses: number[] = [];
    const conn = new Strophe.Connection('wss://example.org/xmpp-websocket', {
        enableStreamManagement: true,
        ...options,
    });
    (conn._proto as any).socket = { send: (s: string) => wire.push(s), readyState: 1 };
    conn.connected = true;
    conn.connect_callback = (status: number) => {
        statuses.push(status);
    };
    conn.jid = 'romeo@example.net';
    return { conn, wire, statuses };
}

/** Feed an inbound frame through the connection's dispatch. */
function recv(conn: InstanceType<typeof Strophe.Connection>, xml: string) {
    conn._dataRecv(parse(`<wrapper>${xml}</wrapper>`));
}

/** Simulate the post-SASL stream features. */
function sendFeatures(conn: InstanceType<typeof Strophe.Connection>, extra = `<sm xmlns="${SM_NS}"/>`) {
    (conn as any)._onStreamFeaturesAfterSASL(parse(`<features><bind xmlns="${BIND_NS}"/>${extra}</features>`));
}

/** Answer the bind IQ with a server-assigned full JID. */
function bindResult(conn: InstanceType<typeof Strophe.Connection>, jid = 'romeo@example.net/orchard') {
    recv(conn, `<iq type="result" id="_bind_auth_2"><bind xmlns="${BIND_NS}"><jid>${jid}</jid></bind></iq>`);
}

/** Drive a connection through bind + enable + enabled. */
function establish(conn: InstanceType<typeof Strophe.Connection>, id = 'sm-id-1') {
    sendFeatures(conn);
    bindResult(conn);
    recv(conn, `<enabled xmlns="${SM_NS}" id="${id}" resume="true"/>`);
}

describe('Stream Management connection integration', () => {
    it('creates the engine when enabled, but only negotiates over websocket', () => {
        expect(makeConn().conn.sm).toBeDefined();
        expect(new Strophe.Connection('wss://example.org/ws').sm).toBeUndefined();

        // The transport can be swapped after construction (e.g. XEP-0156
        // discovery), so the engine exists for a BOSH-constructed connection
        // too — but the post-SASL features must not start SM negotiation on
        // a BOSH stream.
        const bosh = new Strophe.Connection('http://fake', { enableStreamManagement: true });
        expect(bosh.sm).toBeDefined();
        const sent: string[] = [];
        bosh.rawOutput = (data: string) => sent.push(data);
        (bosh as any)._onStreamFeaturesAfterSASL(
            new DOMParser().parseFromString(
                `<features xmlns="jabber:client"><bind xmlns="${BIND_NS}"/><sm xmlns="${SM_NS}"/></features>`,
                'text/xml',
            ).documentElement,
        );
        expect(bosh.sm.serverSupported).toBe(true);
        (bosh as any)._onSessionReady();
        expect(bosh.sm.isTracking()).toBe(false); // no <enable/> sent over BOSH
    });

    it('negotiates a fresh SM session at the CONNECTED-emission point', () => {
        const { conn, wire, statuses } = makeConn();
        sendFeatures(conn);
        expect(conn.sm.serverSupported).toBe(true);
        // no resumable state → the normal bind flow ran
        expect(wire.some((s) => s.includes(BIND_NS))).toBe(true);
        bindResult(conn);
        expect(conn.jid).toBe('romeo@example.net/orchard');
        expect(isNonza(wire.at(-1), 'enable', { resume: 'true' })).toBe(true);
        expect(statuses).toContain(Status.CONNECTED);
        expect(conn.sm.boundJid).toBe('romeo@example.net/orchard');

        // outbound tracking is active from enable-send (before <enabled/>)
        conn.send($msg({ to: 'juliet@example.net' }).c('body').t('early'));
        expect(conn.sm.state.unacked.length).toBe(1);
        // ...but inbound counting only starts at <enabled/> receipt
        recv(conn, '<message from="juliet@example.net"><body>too early</body></message>');
        expect(conn.sm.state.hIn).toBe(0);

        recv(conn, `<enabled xmlns="${SM_NS}" id="sm-id-1" resume="true"/>`);
        expect(conn.isStreamManagementEnabled()).toBe(true);
        expect(conn.hasResumed()).toBe(false);
        expect(conn.sm.state.id).toBe('sm-id-1');
    });

    it('does not negotiate SM when the server omits the feature', () => {
        const { conn, wire } = makeConn();
        sendFeatures(conn, '');
        bindResult(conn);
        expect(conn.sm.serverSupported).toBe(false);
        expect(wire.some((s) => s.includes('<enable'))).toBe(false);
    });

    it('counts inbound stanzas in the dispatch loop and answers <r/>', () => {
        const { conn, wire } = makeConn();
        establish(conn);
        recv(conn, '<message from="juliet@example.net"><body>1</body></message>');
        recv(conn, '<presence from="juliet@example.net/balcony"/>');
        recv(conn, `<r xmlns="${SM_NS}"/>`);
        expect(isNonza(wire.at(-1), 'a', { h: '2' })).toBe(true);
    });

    it('tracks all outbound stanzas via _queueData and requests acks in FIFO order', () => {
        const { conn, wire } = makeConn({ streamManagement: { maxUnacked: 3 } });
        establish(conn);
        const before = wire.length;
        for (let i = 1; i <= 3; i++) {
            conn.send($msg({ to: 'juliet@example.net' }).c('body').t(`m${i}`));
        }
        const sent = wire.slice(before);
        expect(conn.sm.state.unacked.length).toBe(3);
        // the <r/> went out *after* the stanza that triggered it
        expect(sent.findIndex((s) => isNonza(s, 'r'))).toBe(sent.findIndex((s) => s.includes('m3')) + 1);
        recv(conn, `<a xmlns="${SM_NS}" h="3"/>`);
        expect(conn.sm.state.unacked.length).toBe(0);
    });

    it('resumes a dropped session and restores the bound JID (invalid-from regression)', () => {
        const storage = new MemoryStorageBackend();
        const first = makeConn({ streamManagement: { storage } });
        establish(first.conn);
        recv(first.conn, '<message from="juliet@example.net/balcony"><body>1</body></message>');
        recv(first.conn, '<message from="juliet@example.net/balcony"><body>2</body></message>');
        first.conn.send($msg({ to: 'juliet@example.net' }).c('body').t('lost'));
        // the socket dies uncleanly here — resumable state is persisted

        const second = makeConn({ streamManagement: { storage } });
        // simulate what a naive reconnect does: a freshly generated resource
        second.conn.jid = 'romeo@example.net/fresh-resource';
        sendFeatures(second.conn);
        // resumption is attempted instead of binding
        expect(second.wire.length).toBe(1);
        expect(isNonza(second.wire[0], 'resume', { h: '2', previd: 'sm-id-1' })).toBe(true);
        expect(second.statuses).not.toContain(Status.BINDREQUIRED);

        recv(second.conn, `<resumed xmlns="${SM_NS}" h="0" previd="sm-id-1"/>`);
        // the resumed session's bound JID is re-applied before CONNECTED:
        expect(second.conn.jid).toBe('romeo@example.net/orchard');
        expect(second.conn.hasResumed()).toBe(true);
        expect(second.conn.do_bind).toBe(false);
        expect(second.conn.authenticated).toBe(true);
        expect(second.conn.restored).toBe(true);
        expect(second.statuses).toContain(Status.CONNECTED);
        // the unacknowledged stanza was re-sent, followed by an ack request
        expect(second.wire.filter((s) => s.includes('<body>lost</body>')).length).toBe(1);
        expect(isNonza(second.wire.at(-1), 'r')).toBe(true);
        expect(second.conn.sm.state.hIn).toBe(2); // counters carried over
    });

    it('falls back to binding when resumption fails and salvages the queue', () => {
        const storage = new MemoryStorageBackend();
        const first = makeConn({ streamManagement: { storage } });
        establish(first.conn);
        first.conn.send($msg({ to: 'juliet@example.net' }).c('body').t('acked'));
        first.conn.send($msg({ to: 'juliet@example.net' }).c('body').t('salvaged'));

        const second = makeConn({ streamManagement: { storage }, explicitResourceBinding: true });
        sendFeatures(second.conn);
        expect(isNonza(second.wire.at(-1), 'resume', { h: '0', previd: 'sm-id-1' })).toBe(true);
        recv(
            second.conn,
            `<failed xmlns="${SM_NS}" h="1"><item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></failed>`
        );
        // per the XEP the client may bind on this same stream
        expect(second.statuses).toContain(Status.BINDREQUIRED);
        expect(second.conn.do_bind).toBe(true);
        expect(storage.load('strophe-sm:romeo@example.net')).toBeNull();

        second.conn.bind();
        bindResult(second.conn, 'romeo@example.net/newresource');
        expect(isNonza(second.wire.at(-1), 'enable', { resume: 'true' })).toBe(true);
        recv(second.conn, `<enabled xmlns="${SM_NS}" id="sm-id-2" resume="true"/>`);
        // <failed h="1"/> acked the first message; the second was salvaged,
        // re-sent delay-stamped on the new session and queued again
        expect(second.wire.some((s) => s.includes('<body>acked</body>'))).toBe(false);
        const resent = second.wire.find((s) => s.includes('<body>salvaged</body>'));
        expect(resent).toContain('urn:xmpp:delay');
        expect(resent).toContain('stamp="');
        expect(isNonza(second.wire.at(-1), 'r')).toBe(true);
        expect(second.conn.sm.state.unacked.length).toBe(1);
        expect(second.conn.hasResumed()).toBe(false);
    });

    it('runs on without rebinding when the server refuses a fresh <enable/>', () => {
        const { conn, wire, statuses } = makeConn();
        sendFeatures(conn);
        bindResult(conn);
        expect(isNonza(wire.at(-1), 'enable', { resume: 'true' })).toBe(true);
        expect(statuses).toContain(Status.CONNECTED);
        const statusesBefore = [...statuses];
        conn.send($msg({ to: 'juliet@example.net' }).c('body').t('delivered'));
        expect(conn.sm.state.unacked.length).toBe(1);

        // <enable/> is refused (not a <resume/>): the stream is already bound,
        // so SM just goes inactive — no fallback bind, no BINDREQUIRED.
        recv(conn, `<failed xmlns="${SM_NS}"><unexpected-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></failed>`);
        expect(statuses).toEqual(statusesBefore);
        expect(conn.isStreamManagementEnabled()).toBe(false);

        // the already-delivered stanza is not salvaged onto a later session
        conn.sm.serverSupported = true;
        conn.sm.sendEnable('romeo@example.net/orchard');
        const before = wire.length;
        recv(conn, `<enabled xmlns="${SM_NS}" id="sm-id-2" resume="true"/>`);
        expect(wire.slice(before).some((s) => s.includes('delivered'))).toBe(false);
    });

    it('sends a final <a/> and clears persisted state on graceful disconnect', () => {
        const storage = new MemoryStorageBackend();
        const { conn, wire } = makeConn({ streamManagement: { storage } });
        establish(conn);
        recv(conn, '<message from="juliet@example.net"><body>1</body></message>');
        expect(storage.load('strophe-sm:romeo@example.net')).not.toBeNull();

        conn.disconnect('done');
        const ackIdx = wire.findIndex((s) => isNonza(s, 'a', { h: '1' }));
        const closeIdx = wire.findIndex((s) => s.includes('urn:ietf:params:xml:ns:xmpp-framing'));
        expect(ackIdx).toBeGreaterThan(-1);
        expect(closeIdx).toBeGreaterThan(ackIdx);
        expect(storage.load('strophe-sm:romeo@example.net')).toBeNull();
        // the teardown presence was not tracked into a (now dead) queue
        expect(conn.sm.state.unacked.length).toBe(0);
    });
});
