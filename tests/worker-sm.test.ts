import ConnectionManager from '../src/shared-connection-worker';
import { SHARED_WORKER_PROTOCOL_VERSION } from '../src/constants';
import { Strophe, $msg } from '../dist/strophe.node.esm.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const SM_NS = 'urn:xmpp:sm:3';
const SERVICE = 'wss://example.org/xmpp-websocket';
const VERSION = SHARED_WORKER_PROTOCOL_VERSION;
const { Status } = Strophe;

/** A page-side MessagePort double (see worker-arbitration.test.ts). */
class MockPort {
    sent: unknown[][] = [];
    private listeners: ((e: { data: unknown[] }) => void)[] = [];

    addEventListener(type: string, fn: (e: { data: unknown[] }) => void): void {
        if (type === 'message') this.listeners.push(fn);
    }

    start(): void {}

    postMessage(msg: unknown[]): void {
        this.sent.push(msg);
    }

    emit(...data: unknown[]): void {
        this.listeners.forEach((fn) => fn({ data }));
    }

    msgs(name: string): unknown[][] {
        return this.sent.filter((m) => m[0] === name);
    }
}

class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances: FakeWebSocket[] = [];

    url: string;
    readyState = FakeWebSocket.OPEN;
    sent: string[] = [];
    onopen: () => void;
    onerror: (e: unknown) => void;
    onclose: (e: unknown) => void;
    onmessage: (m: { data: string }) => void;

    constructor(url: string, _protocol: string) {
        this.url = url;
        FakeWebSocket.instances.push(this);
    }

    send(data: string): void {
        this.sent.push(data);
    }

    close(): void {
        this.readyState = FakeWebSocket.CLOSED;
    }
}

describe('worker-resident stream management', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        FakeWebSocket.instances = [];
        vi.stubGlobal('WebSocket', FakeWebSocket);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    /** Drive a manager to an enabled SM session with one primary port. */
    function establish() {
        const manager = new ConnectionManager();
        const p1 = new MockPort();
        manager.addPort(p1 as unknown as MessagePort);
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket = FakeWebSocket.instances.at(-1);
        p1.emit('_smFeatures');
        p1.emit('_bound', 'romeo@example.net/orchard');
        socket.onmessage({ data: `<enabled xmlns='${SM_NS}' id='sm-1' resume='true' max='600'/>` });
        return { manager, p1, socket };
    }

    it('negotiates, counts and answers <r/> at the socket, with no page round-trip', () => {
        const manager = new ConnectionManager();
        const p1 = new MockPort();
        manager.addPort(p1 as unknown as MessagePort);
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket = FakeWebSocket.instances[0];

        p1.emit('_smFeatures');
        expect(p1.msgs('_smNoState').length).toBe(1); // nothing to resume yet

        p1.emit('_bound', 'romeo@example.net/orchard');
        expect(manager.jid).toBe('romeo@example.net/orchard'); // shared JID tracks the bound one
        expect(socket.sent.at(-1)).toBe(`<enable xmlns="${SM_NS}" resume="true"/>`);

        socket.onmessage({ data: `<enabled xmlns='${SM_NS}' id='sm-1' resume='true' max='600'/>` });
        expect(p1.msgs('_smEnabled')).toEqual([['_smEnabled', 'sm-1', 600, 'romeo@example.net/orchard']]);

        const framesBefore = p1.msgs('_onMessage').length;
        socket.onmessage({ data: "<message from='juliet@example.net'><body>1</body></message>" });
        socket.onmessage({ data: `<r xmlns='${SM_NS}'/>` });
        expect(socket.sent.at(-1)).toBe(`<a xmlns="${SM_NS}" h="1"/>`);
        // frames still reach the tabs
        expect(p1.msgs('_onMessage').length).toBe(framesBefore + 2);
    });

    it('writes the periodic <r/> behind the stanza that triggers it, not ahead of it', () => {
        const { manager, p1, socket } = establish();
        // maxUnacked defaults to 5: the 5th outbound stanza triggers an <r/>,
        // which must land on the wire *after* that stanza (matching the page's
        // _queueData FIFO), so the server counts it before answering.
        for (let i = 1; i <= 5; i++) {
            p1.emit('send', `<message to='juliet@example.net'><body>${i}</body></message>`);
        }
        const fifthIdx = socket.sent.findIndex((s) => s.includes('<body>5</body>'));
        const rIdx = socket.sent.findIndex((s) => s === `<r xmlns="${SM_NS}"/>`);
        expect(fifthIdx).toBeGreaterThan(-1);
        expect(rIdx).toBe(fifthIdx + 1);
        expect(manager.sm.state.unacked.length).toBe(5);
    });

    it('replays a stanza sent from a secondary tab after resumption', () => {
        const { manager, p1, socket } = establish();

        // a secondary attaches and receives the *bound* JID
        const p2 = new MockPort();
        manager.addPort(p2 as unknown as MessagePort);
        p2.emit('_attach', SERVICE, VERSION);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, 'romeo@example.net/orchard']]);

        // the secondary sends; the stanza enters the worker-owned queue
        p2.emit('send', "<message to='juliet@example.net' type='chat'><body>from p2</body></message>");
        expect(socket.sent.at(-1)).toContain('from p2');
        expect(manager.sm.state.unacked.length).toBe(1);

        // the primary tab dies — the secondary is promoted with the bound JID
        p1.emit('_bye');
        expect(p2.msgs('_promote')).toEqual([['_promote', 'romeo@example.net/orchard']]);

        // the socket dies uncleanly; the promoted tab reconnects
        socket.readyState = FakeWebSocket.CLOSED;
        p2.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket2 = FakeWebSocket.instances[1];
        p2.emit('_smFeatures');
        const resume = socket2.sent.find((s) => s.startsWith('<resume'));
        expect(resume).toContain('previd="sm-1"');
        expect(p2.msgs('_smNoState').length).toBe(0); // the worker resumed on its own

        socket2.onmessage({ data: `<resumed xmlns='${SM_NS}' h='0' previd='sm-1'/>` });
        expect(p2.msgs('_smResumed')).toEqual([['_smResumed', 'romeo@example.net/orchard']]);
        // the secondary's stanza was replayed from the worker queue on the new socket
        expect(socket2.sent.filter((s) => s.includes('from p2')).length).toBe(1);
        expect(socket2.sent.at(-1)).toBe(`<r xmlns="${SM_NS}"/>`);
        expect(manager.sm.state.unacked.length).toBe(1); // still unacknowledged
        socket2.onmessage({ data: `<a xmlns='${SM_NS}' h='1'/>` });
        expect(manager.sm.state.unacked.length).toBe(0);
    });

    it('broadcasts _smFailed on failed resumption and salvages the queue', () => {
        const { manager, p1, socket } = establish();
        p1.emit('send', "<message to='juliet@example.net'><body>salvaged</body></message>");
        expect(manager.sm.state.unacked.length).toBe(1);

        socket.readyState = FakeWebSocket.CLOSED;
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket2 = FakeWebSocket.instances[1];
        p1.emit('_smFeatures');
        expect(socket2.sent.some((s) => s.startsWith('<resume'))).toBe(true);

        socket2.onmessage({
            data: `<failed xmlns='${SM_NS}' h='0'><item-not-found xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></failed>`,
        });
        expect(p1.msgs('_smFailed').length).toBe(1);

        // the primary binds again and reports; the fresh session resends the salvaged stanza
        p1.emit('_bound', 'romeo@example.net/fresh');
        expect(manager.jid).toBe('romeo@example.net/fresh');
        socket2.onmessage({ data: `<enabled xmlns='${SM_NS}' id='sm-2' resume='true'/>` });
        const resent = socket2.sent.find((s) => s.includes('salvaged'));
        expect(resent).toContain('urn:xmpp:delay');
        expect(p1.msgs('_smEnabled').at(-1)).toEqual(['_smEnabled', 'sm-2', null, 'romeo@example.net/fresh']);
    });

    it('does not broadcast _smFailed when a fresh <enable/> is refused', () => {
        const manager = new ConnectionManager();
        const p1 = new MockPort();
        manager.addPort(p1 as unknown as MessagePort);
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket = FakeWebSocket.instances.at(-1);
        p1.emit('_smFeatures'); // nothing to resume → _smNoState, no <resume/>
        p1.emit('_bound', 'romeo@example.net/orchard'); // sends a fresh <enable/>

        socket.onmessage({ data: `<failed xmlns='${SM_NS}'/>` }); // the server refuses it
        // <failed/> answering an <enable/> is not the tabs' concern (the stream
        // is bound and runs without SM); only a failed *resume* triggers rebind
        expect(p1.msgs('_smFailed').length).toBe(0);
    });

    it('clears resume-pending on reconnect so a dropped resume cannot leave a stale flag', () => {
        const { manager, p1, socket } = establish();
        socket.readyState = FakeWebSocket.CLOSED;
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket2 = FakeWebSocket.instances[1];
        p1.emit('_smFeatures'); // resumable → <resume/> sent, resume-pending set
        expect(socket2.sent.some((s) => s.startsWith('<resume'))).toBe(true);
        expect(manager.sm.resumePending).toBe(true);

        // the socket dies again before any <resumed/>/<failed/> reply; the
        // reconnect resets the engine, so the flag does not survive to make a
        // later refused <enable/> look like a failed resume
        socket2.readyState = FakeWebSocket.CLOSED;
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        expect(manager.sm.resumePending).toBe(false);
    });

    it('reports frames the peeker cannot parse while SM is active (counter-drift guard)', () => {
        const { p1, socket } = establish();
        const before = p1.msgs('log').length;

        // both look like stanzas but the regex peeker returns null (unquoted
        // attribute), so they pass through uncounted/untracked — surface it
        socket.onmessage({ data: '<message foo=bar>secret body</message>' }); // inbound
        p1.emit('send', '<presence foo=bar/>'); // outbound

        const logs = p1.msgs('log').slice(before);
        expect(logs.length).toBe(2);
        expect(logs[0][1]).toBe('error');
        expect(logs[1][1]).toBe('error');
        // the opening tag is logged (so the peeker can be fixed)...
        expect(logs[0][2]).toContain('inbound');
        expect(logs[0][2]).toContain('<message foo=bar>');
        expect(logs[1][2]).toContain('outbound');
        expect(logs[1][2]).toContain('<presence foo=bar/>');
        // ...but the payload after the opening tag is not
        expect(logs[0][2]).not.toContain('secret body');
    });

    it('stays quiet for benign non-element frames (prolog, whitespace, empty)', () => {
        const { p1, socket } = establish();
        const before = p1.msgs('log').length;
        socket.onmessage({ data: '<?xml version="1.0"?>' });
        socket.onmessage({ data: '   ' });
        socket.onmessage({ data: '' });
        expect(p1.msgs('log').length).toBe(before);
    });

    it('salvages a stanza sent into a dead socket and replays it after resumption', () => {
        const { manager, p1, socket } = establish();
        socket.readyState = FakeWebSocket.CLOSED;
        p1.emit('send', "<message to='juliet@example.net'><body>rescued</body></message>");
        // the tab is told the truth instead of a silent drop...
        expect(p1.msgs('_onClose').length).toBe(1);
        expect(socket.sent.some((s) => s.includes('rescued'))).toBe(false);
        // ...and the stanza survives in the worker-owned SM queue
        expect(manager.sm.state.unacked.length).toBe(1);

        // the tab reconnects; the worker resumes and replays the stanza
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        const socket2 = FakeWebSocket.instances[1];
        p1.emit('_smFeatures');
        expect(socket2.sent.some((s) => s.startsWith('<resume'))).toBe(true);
        socket2.onmessage({ data: `<resumed xmlns='${SM_NS}' h='0' previd='sm-1'/>` });
        expect(socket2.sent.filter((s) => s.includes('rescued')).length).toBe(1);
    });

    it('a <close/> sent into a dead socket still ends the resumable session', () => {
        const { manager, p1, socket } = establish();
        socket.readyState = FakeWebSocket.CLOSED;
        p1.emit('send', '<close xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>');
        expect(p1.msgs('_onClose').length).toBe(1);
        expect(manager.sm.state.enabled).toBe(false);

        // the deliberately-ended session is not resumed on the next stream
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        p1.emit('_smFeatures');
        expect(p1.msgs('_smNoState').length).toBe(2); // one from establish(), one now
        expect(FakeWebSocket.instances[1].sent.some((s) => s.startsWith('<resume'))).toBe(false);
    });

    it('sends a final <a/> before relaying <close/> and clears the session', () => {
        const { manager, p1, socket } = establish();
        socket.onmessage({ data: "<message from='juliet@example.net'><body>1</body></message>" });

        p1.emit('send', '<close xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>');
        const ackIdx = socket.sent.findIndex((s) => s === `<a xmlns="${SM_NS}" h="1"/>`);
        const closeIdx = socket.sent.findIndex((s) => s.includes('xmpp-framing'));
        expect(ackIdx).toBeGreaterThan(-1);
        expect(closeIdx).toBeGreaterThan(ackIdx);
        expect(manager.sm.state.enabled).toBe(false);

        // a later stream has nothing to resume (one _smNoState from the
        // initial negotiation in establish(), one from this reconnect)
        socket.readyState = FakeWebSocket.CLOSED;
        p1.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        p1.emit('_smFeatures');
        expect(p1.msgs('_smNoState').length).toBe(2);
        expect(FakeWebSocket.instances[1].sent.some((s) => s.startsWith('<resume'))).toBe(false);
    });
});

describe('page-side state mirror under options.worker', () => {
    class FakeSharedWorkerPort {
        posted: unknown[][] = [];
        onmessage: ((ev: { data: unknown[] }) => void) | null = null;
        start(): void {}
        postMessage(msg: unknown[]): void {
            this.posted.push(msg);
        }
    }
    class FakeSharedWorker {
        port = new FakeSharedWorkerPort();
        onerror: unknown;
        constructor(_url: string, _name?: string) {}
    }

    beforeEach(() => vi.stubGlobal('SharedWorker', FakeSharedWorker));
    afterEach(() => vi.unstubAllGlobals());

    function parse(xml: string): Element {
        return new DOMParser().parseFromString(xml, 'text/xml').documentElement;
    }

    function makeConn(options: Record<string, unknown> = {}) {
        const statuses: number[] = [];
        const conn = new Strophe.Connection(SERVICE, {
            worker: '/dist/shared-connection-worker.js',
            enableStreamManagement: true,
            ...options,
        });
        (conn._proto as any)._setSocket();
        conn.connected = true;
        conn.connect_callback = (s: number) => statuses.push(s);
        conn.jid = 'romeo@example.net';
        const port = (conn._proto as any).worker.port as InstanceType<typeof FakeSharedWorkerPort>;
        const fromWorker = (...msg: unknown[]) => (conn._proto as any)._onWorkerMessage({ data: msg });
        fromWorker('_role', 'primary', 'romeo@example.net');
        return { conn, port, statuses, fromWorker };
    }

    function sendFeatures(conn: InstanceType<typeof Strophe.Connection>) {
        (conn as any)._onStreamFeaturesAfterSASL(
            parse(`<features><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"/><sm xmlns="${SM_NS}"/></features>`),
        );
    }

    it('delegates the resume decision to the worker and applies _smResumed', () => {
        const { conn, port, statuses, fromWorker } = makeConn();
        sendFeatures(conn);
        expect(port.posted.at(-1)).toEqual(['_smFeatures']);
        expect(statuses).not.toContain(Status.BINDREQUIRED); // flow paused, no bind attempted

        fromWorker('_smResumed', 'romeo@example.net/orchard');
        expect(conn.jid).toBe('romeo@example.net/orchard');
        expect(conn.hasResumed()).toBe(true);
        expect(conn.do_bind).toBe(false);
        expect(conn.restored).toBe(true);
        expect(statuses).toContain(Status.CONNECTED);
    });

    it('proceeds to bind on _smNoState and reports the bound JID', () => {
        const { conn, port, statuses, fromWorker } = makeConn();
        sendFeatures(conn);
        fromWorker('_smNoState');
        // the bind IQ went out through the worker
        expect(port.posted.some((m) => m[0] === 'send' && String(m[1]).includes('xmpp-bind'))).toBe(true);
        (conn as any)._dataRecv(
            parse(
                '<wrapper><iq type="result" id="_bind_auth_2"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">' +
                    '<jid>romeo@example.net/orchard</jid></bind></iq></wrapper>',
            ),
        );
        expect(port.posted.at(-1)).toEqual(['_bound', 'romeo@example.net/orchard']);
        expect(statuses).toContain(Status.CONNECTED);

        fromWorker('_smEnabled', 'sm-1', 600, 'romeo@example.net/orchard');
        expect(conn.isStreamManagementEnabled()).toBe(true);
        expect(conn.sm.boundJid).toBe('romeo@example.net/orchard');
        expect(conn.hasResumed()).toBe(false);
    });

    it('falls back to binding on _smFailed', () => {
        const { conn, statuses, fromWorker } = makeConn({ explicitResourceBinding: true });
        sendFeatures(conn);
        fromWorker('_smFailed');
        expect(conn.do_bind).toBe(true);
        expect(statuses).toContain(Status.BINDREQUIRED);
        expect(conn.sm.enabled).toBe(false);
    });

    it('answers the worker ping with a pong', () => {
        const { port, fromWorker } = makeConn();
        fromWorker('_ping');
        expect(port.posted.at(-1)).toEqual(['_pong']);
    });

    it('the mirror is inert: the page neither counts nor queues', () => {
        const { conn, fromWorker } = makeConn();
        sendFeatures(conn);
        fromWorker('_smResumed', 'romeo@example.net/orchard');
        conn.send($msg({ to: 'juliet@example.net' }).c('body').t('hi'));
        expect(conn.sm.state.unacked.length).toBe(0); // the worker owns the queue
        (conn as any)._dataRecv(parse('<wrapper><message from="juliet@example.net"/></wrapper>'));
        expect(conn.sm.state.hIn).toBe(0); // the worker owns the counters
        expect(conn.hasResumed()).toBe(true); // ...but the state is mirrored
    });
});
