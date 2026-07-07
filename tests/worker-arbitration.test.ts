import ConnectionManager, {
    PING_INTERVAL,
    PORT_GC_TIMEOUT,
    PRIMARY_TIMEOUT,
    SOCKET_GRACE,
} from '../src/shared-connection-worker';
import { SHARED_WORKER_PROTOCOL_VERSION, Status } from '../src/constants';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const SERVICE = 'wss://example.org/xmpp-websocket';
const JID = 'romeo@example.net/orchard';
const VERSION = SHARED_WORKER_PROTOCOL_VERSION;

/**
 * A page-side MessagePort double: records worker→page messages and lets the
 * test emit page→worker messages.
 */
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

    /** Simulate a page→worker message. */
    emit(...data: unknown[]): void {
        this.listeners.forEach((fn) => fn({ data }));
    }

    /** All received messages with the given method name. */
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
    // Frames are only relayed once the socket is OPEN, which it is by the
    // time the primary reports _bound (that follows _onOpen → SASL → bind).
    readyState = FakeWebSocket.OPEN;
    sent: string[] = [];
    onopen: () => void;
    onerror: (e: unknown) => void;
    onclose: (e: unknown) => void;
    onmessage: (m: unknown) => void;

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

function makeManager() {
    const manager = new ConnectionManager();
    const join = () => {
        const port = new MockPort();
        manager.addPort(port as unknown as MessagePort);
        return port;
    };
    return { manager, join };
}

/** Join a port and let it drive/share the connection via _connect. */
function connect(port: MockPort, jid = JID) {
    port.emit('_connect', SERVICE, jid, VERSION);
}

/** Report bind completion, establishing the session (see _bound). */
function bind(port: MockPort, jid = JID) {
    port.emit('_bound', jid);
}

/** _attach with the protocol version, as the page sends it. */
function attach(port: MockPort) {
    port.emit('_attach', SERVICE, VERSION);
}

describe('shared-connection-worker arbitration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        FakeWebSocket.instances = [];
        vi.stubGlobal('WebSocket', FakeWebSocket);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('makes the first connecting port primary and opens the socket', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        expect(FakeWebSocket.instances.length).toBe(1);
        expect(p1.msgs('_role')).toEqual([['_role', 'primary', JID]]);
    });

    it('joins a second _connect as secondary over the established session (no reconnect)', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        connect(p2);
        expect(FakeWebSocket.instances.length).toBe(1); // idempotent _connect
        expect(p2.msgs('_role')).toEqual([['_role', 'secondary', JID]]);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, JID]]);
        // per-port addressing: the primary got no attach callback
        expect(p1.msgs('_attachCallback')).toEqual([]);
    });

    it('reconnects when a different user connects', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        connect(p2, 'juliet@example.net/balcony');
        expect(FakeWebSocket.instances.length).toBe(2);
        expect(p2.msgs('_role')).toEqual([['_role', 'primary', 'juliet@example.net/balcony']]);
        expect(p1.msgs('_role').at(-1)).toEqual(['_role', 'secondary', 'juliet@example.net/balcony']);
    });

    it('attaches only the requesting port, and fails without a socket', () => {
        const { join } = makeManager();
        const p1 = join();
        attach(p1);
        expect(p1.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHFAIL]]);

        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, JID]]);
        expect(p2.msgs('_role')).toEqual([['_role', 'secondary', JID]]);
        // per-port addressing: p1 only ever saw its own (failed) attach reply
        expect(p1.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHFAIL]]);
    });

    it('parks joins that arrive during the handshake and answers them with the bound JID', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1, 'romeo@example.net'); // pre-bind JID, no resource yet
        const p2 = join();
        attach(p2);
        const p3 = join();
        p3.emit('_connect', SERVICE, 'romeo@example.net', VERSION);
        // the handshake is still in flight: nobody is told ATTACHED (which
        // would hand out a pre-bind JID on an unauthenticated stream)
        expect(p2.msgs('_attachCallback')).toEqual([]);
        expect(p3.msgs('_attachCallback')).toEqual([]);
        expect(FakeWebSocket.instances.length).toBe(1);

        bind(p1, JID);
        expect(p2.msgs('_role')).toEqual([['_role', 'secondary', JID]]);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, JID]]);
        expect(p3.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, JID]]);
    });

    it('fails parked joins when the socket dies mid-handshake', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        const p2 = join();
        attach(p2);
        FakeWebSocket.instances[0].onclose({ reason: 'boom' });
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHFAIL]]);
    });

    it('fails a parked _connect join with _onClose instead of ATTACHFAIL, so the page retries', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        const p2 = join();
        connect(p2); // same user, handshake in flight: parked
        FakeWebSocket.instances[0].onclose({ reason: 'boom' });
        // ATTACHFAIL is the attach() contract; a connect()-initiated page
        // would treat it as terminal and wedge, so it gets _onClose, which
        // fails the connect attempt and lets the embedder reconnect.
        expect(p2.msgs('_attachCallback')).toEqual([]);
        expect(p2.msgs('_onClose').length).toBeGreaterThanOrEqual(1);
    });

    it('closes the socket when the connecting primary leaves mid-handshake', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        const p2 = join();
        attach(p2);
        p1.emit('_bye');
        // nobody else can finish the handshake: the socket is killed, the
        // parked join fails, and the remaining tab is told to reconnect
        expect(FakeWebSocket.instances[0].readyState).toBe(FakeWebSocket.CLOSED);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHFAIL]]);
        expect(p2.msgs('_onClose').length).toBe(1);
    });

    it('rejects a page speaking a different protocol version', () => {
        const { manager, join } = makeManager();
        const p1 = join();
        p1.emit('_connect', SERVICE, JID, VERSION + 1);
        expect(FakeWebSocket.instances.length).toBe(0);
        expect(p1.msgs('_onClose').length).toBe(1);
        expect(p1.msgs('log').some((m) => m[1] === 'fatal')).toBe(true);
        expect(manager.ports.size).toBe(0); // not admitted
    });

    it('broadcasts inbound traffic to all live ports', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        FakeWebSocket.instances[0].onmessage({ data: '<message/>' });
        expect(p1.msgs('_onMessage')).toEqual([['_onMessage', { 'data': '<message/>' }]]);
        expect(p2.msgs('_onMessage')).toEqual([['_onMessage', { 'data': '<message/>' }]]);
    });

    it('targets handshake frames at the primary only — a concurrently connecting tab hears nothing', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1, 'romeo@example.net');
        const p2 = join();
        connect(p2, 'romeo@example.net'); // races in mid-handshake and is parked
        const socket = FakeWebSocket.instances[0];
        expect(FakeWebSocket.instances.length).toBe(1);

        socket.onmessage({ data: "<open xmlns='urn:ietf:params:xml:ns:xmpp-framing'/>" });
        socket.onmessage({ data: '<stream:features/>' });
        // only the driving primary hears the handshake: the parked tab would
        // treat these frames as its own handshake and start a second SASL
        // negotiation on the shared socket
        expect(p1.msgs('_onMessage').length).toBe(2);
        expect(p2.msgs('_onMessage')).toEqual([]);

        bind(p1);
        socket.onmessage({ data: '<message/>' });
        expect(p1.msgs('_onMessage').length).toBe(3);
        expect(p2.msgs('_onMessage')).toEqual([['_onMessage', { 'data': '<message/>' }]]);
        // the parked tab was told its role (which swaps its message handler)
        // before it received its first raw frame
        const roleIdx = p2.sent.findIndex((m) => m[0] === '_role');
        const frameIdx = p2.sent.findIndex((m) => m[0] === '_onMessage');
        expect(roleIdx).toBeGreaterThan(-1);
        expect(roleIdx).toBeLessThan(frameIdx);
    });

    it('relays send from any port to the socket', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        p2.emit('send', '<presence/>');
        expect(FakeWebSocket.instances[0].sent).toEqual(['<presence/>']);
    });

    it('reflects sent messages and presences to the other tabs, never the sender', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        const p3 = join();
        attach(p3);
        // reflection is an arbitration feature: it works without SM (no
        // engine exists in this test)
        const msg = "<message to='juliet@example.net' type='chat'><body>hi</body></message>";
        p1.emit('send', msg);
        expect(p1.msgs('_onStanzaSent')).toEqual([]);
        expect(p2.msgs('_onStanzaSent')).toEqual([['_onStanzaSent', msg]]);
        expect(p3.msgs('_onStanzaSent')).toEqual([['_onStanzaSent', msg]]);
        // symmetric: a secondary's send reaches the primary and the other secondary
        p2.emit('send', "<presence type='away'/>");
        expect(p1.msgs('_onStanzaSent')).toEqual([['_onStanzaSent', "<presence type='away'/>"]]);
        expect(p3.msgs('_onStanzaSent').length).toBe(2);
        // p2 only ever saw p1's message, not its own presence
        expect(p2.msgs('_onStanzaSent')).toEqual([['_onStanzaSent', msg]]);
    });

    it('does not reflect IQs, nonzas or close frames', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        p1.emit('send', "<iq type='get' id='1'><query xmlns='jabber:iq:roster'/></iq>");
        p1.emit('send', '<close xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>');
        expect(p2.msgs('_onStanzaSent')).toEqual([]);
    });

    it('promotes a secondary when the primary says _bye — same socket', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        p1.emit('_bye');
        expect(p2.msgs('_promote')).toEqual([['_promote', JID]]);
        expect(FakeWebSocket.instances.length).toBe(1); // no reconnect
        // the departed port no longer receives broadcasts
        FakeWebSocket.instances[0].onmessage({ data: '<iq/>' });
        expect(p1.msgs('_onMessage')).toEqual([]);
        expect(p2.msgs('_onMessage').length).toBe(1);
    });

    it('fails a silent primary over to a fresh port but keeps delivering to it', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        // p1 goes silent (e.g. a background-throttled tab); p2 answers pings
        for (let i = 0; i < 3; i++) {
            vi.advanceTimersByTime(PING_INTERVAL);
            p2.emit('_pong');
        }
        expect(p2.msgs('_promote')).toEqual([['_promote', JID]]);
        expect(p1.msgs('_role').at(-1)).toEqual(['_role', 'secondary', JID]);
        // ...but the silent port still receives everything: silence means
        // throttled-or-frozen, not gone, and delivery is not gated on it
        FakeWebSocket.instances[0].onmessage({ data: '<iq/>' });
        expect(p1.msgs('_onMessage').length).toBe(1);
        expect(p2.msgs('_onMessage').length).toBe(1);
    });

    it('does not fail over when no fresher port exists', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        vi.advanceTimersByTime(PRIMARY_TIMEOUT + 2 * PING_INTERVAL);
        // sole (silent) port: it keeps the primary role
        expect(p1.msgs('_role').filter((m) => m[1] === 'secondary')).toEqual([]);
        expect(p1.msgs('_promote')).toEqual([]);
    });

    it('fails over immediately when the primary announces a freeze (_relinquish)', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        p1.emit('_relinquish');
        expect(p1.msgs('_role').at(-1)).toEqual(['_role', 'secondary', JID]);
        expect(p2.msgs('_promote')).toEqual([['_promote', JID]]);
        expect(FakeWebSocket.instances.length).toBe(1); // same socket
    });

    it('keeps a sole port primary on _relinquish', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        p1.emit('_relinquish');
        expect(p1.msgs('_role').filter((m) => m[1] === 'secondary')).toEqual([]);
    });

    it('drops a port only after PORT_GC_TIMEOUT and re-admits it when it speaks', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const p2 = join();
        attach(p2);
        const socket = FakeWebSocket.instances[0];
        // p2 (a secondary) goes completely silent; p1 stays live
        const sweeps = Math.ceil(PORT_GC_TIMEOUT / PING_INTERVAL) + 1;
        for (let i = 0; i < sweeps; i++) {
            vi.advanceTimersByTime(PING_INTERVAL);
            p1.emit('_pong');
        }
        socket.onmessage({ data: '<iq/>' });
        expect(p2.msgs('_onMessage')).toEqual([]); // dropped for good
        expect(p1.msgs('_onMessage').length).toBe(1);

        // it speaks again: re-admitted (as secondary) and receives again
        p2.emit('_pong');
        expect(p2.msgs('_role').at(-1)).toEqual(['_role', 'secondary', JID]);
        socket.onmessage({ data: '<iq/>' });
        expect(p2.msgs('_onMessage').length).toBe(1);
    });

    it('answers messages sent into a dead socket with _onClose instead of dropping them', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        p1.emit('_closeSocket');
        p1.emit('send', '<presence/>');
        expect(p1.msgs('_onClose').length).toBe(1);
    });

    it('answers a send on a still-connecting socket with _onClose instead of throwing', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        const socket = FakeWebSocket.instances[0];
        socket.readyState = FakeWebSocket.CONNECTING; // handshake not finished
        p1.emit('send', '<presence/>');
        // a send() on a CONNECTING socket throws and loses the frame, so the
        // dispatcher intercepts it: nothing hits the wire, the tab is told
        expect(socket.sent).toEqual([]);
        expect(p1.msgs('_onClose').length).toBe(1);
    });

    it('tells a returning port about a dead socket instead of assigning it a role', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const socket = FakeWebSocket.instances[0];
        socket.readyState = FakeWebSocket.OPEN;
        p1.emit('_bye');
        vi.advanceTimersByTime(SOCKET_GRACE + 1);
        expect(socket.readyState).toBe(FakeWebSocket.CLOSED);

        // a tab returns (e.g. thawed after everything else went away): it is
        // told the session is gone, not handed a role on a dead socket
        const p2 = join();
        p2.emit('_pong');
        expect(p2.msgs('_onClose').length).toBe(1);
        expect(p2.msgs('_role')).toEqual([]);
    });

    it('closes the socket only after a grace period once the last port leaves', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const socket = FakeWebSocket.instances[0];
        socket.readyState = FakeWebSocket.OPEN;
        p1.emit('_bye');
        vi.advanceTimersByTime(SOCKET_GRACE - 1);
        expect(socket.readyState).toBe(FakeWebSocket.OPEN);
        vi.advanceTimersByTime(1);
        expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    });

    it('a port joining during the grace period keeps the socket alive', () => {
        const { join } = makeManager();
        const p1 = join();
        connect(p1);
        bind(p1);
        const socket = FakeWebSocket.instances[0];
        socket.readyState = FakeWebSocket.OPEN;
        p1.emit('_bye');
        vi.advanceTimersByTime(SOCKET_GRACE - 1);
        const p2 = join();
        attach(p2);
        expect(p2.msgs('_attachCallback')).toEqual([['_attachCallback', Status.ATTACHED, JID]]);
        expect(p2.msgs('_role')).toEqual([['_role', 'primary', JID]]); // nobody else left
        vi.advanceTimersByTime(SOCKET_GRACE * 2);
        expect(socket.readyState).toBe(FakeWebSocket.OPEN);
    });

    it('rejects unknown methods without touching state', () => {
        const { join } = makeManager();
        const p1 = join();
        p1.emit('constructor', 'x');
        p1.emit('_promoteNext');
        expect(p1.msgs('log').length).toBe(2);
        expect(FakeWebSocket.instances.length).toBe(0);
    });
});
