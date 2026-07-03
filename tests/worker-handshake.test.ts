/**
 * End-to-end multi-tab handshake: two real Connections (page side) bridged to
 * one real ConnectionManager (worker side) over one fake socket.
 *
 * This is the regression test for the concurrent-connect race: when two tabs
 * connect at the same time (e.g. a session-restored window), exactly ONE of
 * them may drive the handshake. The other join is parked by the worker and
 * must not hear the handshake frames — a tab whose _messageHandler is still
 * _onInitialMessage would treat them as its *own* handshake and start a
 * second SASL negotiation on the shared socket.
 */
import ConnectionManager from '../src/shared-connection-worker';
import { Strophe } from '../dist/strophe.node.esm.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const SERVICE = 'wss://example.org/xmpp-websocket';
const { Status } = Strophe;

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

/** The worker side shared by all FakeSharedWorkers in a test. */
let manager: ConnectionManager;

/**
 * The page's end of a synchronous in-memory MessagePort pair. Each
 * FakeSharedWorker wires one of these to a worker-side counterpart that is
 * registered with the shared ConnectionManager, so page and worker run the
 * real protocol against each other.
 */
class PagePort {
    onmessage: ((ev: { data: unknown[] }) => void) | null = null;
    received: unknown[][] = [];
    private _toWorker: (msg: unknown[]) => void;

    constructor(toWorker: (msg: unknown[]) => void) {
        this._toWorker = toWorker;
    }

    start(): void {}

    postMessage(msg: unknown[]): void {
        this._toWorker(msg);
    }

    /** Deliver a worker→page message. */
    _deliver(msg: unknown[]): void {
        this.received.push(msg);
        this.onmessage?.({ data: msg });
    }
}

class FakeSharedWorker {
    port: PagePort;
    onerror: unknown;

    constructor(_url: string, _name?: string) {
        const listeners: ((e: { data: unknown[] }) => void)[] = [];
        const workerPort = {
            addEventListener: (type: string, fn: (e: { data: unknown[] }) => void) => {
                if (type === 'message') listeners.push(fn);
            },
            start: () => {},
            postMessage: (msg: unknown[]) => this.port._deliver(msg),
        };
        this.port = new PagePort((msg) => listeners.forEach((fn) => fn({ data: msg })));
        manager.addPort(workerPort as unknown as MessagePort);
    }
}

describe('concurrent connect through the shared worker', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        manager = new ConnectionManager();
        FakeWebSocket.instances = [];
        vi.stubGlobal('WebSocket', FakeWebSocket);
        vi.stubGlobal('SharedWorker', FakeSharedWorker);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('lets exactly one of two concurrently connecting tabs drive the handshake', () => {
        const statusesA: number[] = [];
        const statusesB: number[] = [];
        const connA = new Strophe.Connection(SERVICE, { worker: 'shared-connection-worker.js' });
        const connB = new Strophe.Connection(SERVICE, { worker: 'shared-connection-worker.js' });
        connA.connect('romeo@example.net', 'secret', (s: number) => statusesA.push(s));
        connB.connect('romeo@example.net', 'secret', (s: number) => statusesB.push(s));

        // both tabs share one socket; the second join was parked, not a reconnect
        expect(FakeWebSocket.instances.length).toBe(1);
        const socket = FakeWebSocket.instances[0];
        const server = (xml: string) => socket.onmessage({ data: xml });

        socket.onopen();
        // _onOpen is port-targeted: only the primary opened the stream
        expect(socket.sent.filter((s) => s.startsWith('<open')).length).toBe(1);

        server('<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" version="1.0" from="example.net" id="s1"/>');
        server(
            '<stream:features xmlns:stream="http://etherx.jabber.org/streams">' +
                '<mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><mechanism>PLAIN</mechanism></mechanisms>' +
                '</stream:features>',
        );

        // THE regression assertion: exactly one tab reacted to the handshake
        // frames with a SASL negotiation
        expect(socket.sent.filter((s) => s.startsWith('<auth')).length).toBe(1);

        server('<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>');
        // the stream restart likewise came from the primary alone
        expect(socket.sent.filter((s) => s.startsWith('<open')).length).toBe(2);

        server('<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" version="1.0" from="example.net" id="s2"/>');
        server(
            '<stream:features xmlns:stream="http://etherx.jabber.org/streams">' +
                '<bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"/>' +
                '</stream:features>',
        );
        expect(socket.sent.filter((s) => s.includes('xmpp-bind')).length).toBe(1);

        server(
            '<iq type="result" id="_bind_auth_2" xmlns="jabber:client">' +
                '<bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><jid>romeo@example.net/orchard</jid></bind>' +
                '</iq>',
        );

        // A drove the handshake to CONNECTED; B was attached to the shared
        // session with the bound JID (not its own pre-bind one)
        expect(statusesA).toContain(Status.CONNECTED);
        expect(connA.role).toBe('primary');
        expect(statusesB).toContain(Status.ATTACHED);
        expect(statusesB).not.toContain(Status.CONNECTED);
        expect(connB.role).toBe('secondary');
        expect(connB.jid).toBe('romeo@example.net/orchard');

        // live traffic now reaches both tabs
        let gotA = 0;
        let gotB = 0;
        connA.addHandler(() => ++gotA && true, null, 'message');
        connB.addHandler(() => ++gotB && true, null, 'message');
        server('<message from="juliet@example.net" xmlns="jabber:client"><body>hi</body></message>');
        expect(gotA).toBe(1);
        expect(gotB).toBe(1);
    });
});
