/**
 * Tests for the XEP-0114 external component transport (src/component.ts) and
 * its streaming XML parser (src/component-parser.ts).
 *
 * The transport is exercised end-to-end against a mock TCP server that speaks
 * the server side of the component protocol, and the parser is fed stanzas
 * split across arbitrary byte boundaries (including inside a multi-byte UTF-8
 * character).
 */
import net from 'node:net';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { Strophe, Component, ComponentParser, stx } from '../dist/strophe.node.esm.js';
import { describe, it, expect, afterEach } from 'vitest';

const COMPONENT_DOMAIN = 'component.example.org';
const SECRET = 'the-shared-secret';
const STREAM_ID = 'mock-stream-3697395463';

function expectedDigest(streamId: string, secret: string): string {
    return createHash('sha1')
        .update(streamId + secret, 'utf8')
        .digest('hex');
}

interface MockServer {
    port: number;
    /** All stanza data received from the client after the handshake. */
    received: string;
    /** Send a raw string to the connected client. */
    push(xml: string): void;
    close(): Promise<void>;
}

/**
 * Stand up a mock TCP server that plays the XEP-0114 server role: it replies to
 * the component stream header with a header carrying a fixed stream id,
 * validates the handshake digest against sha1(id + secret) and replies
 * `<handshake/>` on success or a stream error on failure.
 */
function startMockServer(options: { secret?: string; streamId?: string } = {}): Promise<MockServer> {
    const secret = options.secret ?? SECRET;
    const streamId = options.streamId ?? STREAM_ID;

    return new Promise((resolve) => {
        let clientSocket: net.Socket | null = null;
        const state = { received: '' };

        const server = net.createServer((socket) => {
            clientSocket = socket;
            let buffer = '';
            let headerSent = false;
            let handshakeDone = false;
            socket.setEncoding('utf8');

            socket.on('data', (data: string) => {
                buffer += data;

                if (!headerSent && buffer.includes('<stream:stream')) {
                    headerSent = true;
                    socket.write(
                        "<?xml version='1.0'?>" +
                            "<stream:stream xmlns:stream='http://etherx.jabber.org/streams' " +
                            `xmlns='jabber:component:accept' from='${COMPONENT_DOMAIN}' id='${streamId}'>`
                    );
                }

                if (!handshakeDone) {
                    const m = buffer.match(/<handshake>([^<]*)<\/handshake>/);
                    if (m) {
                        handshakeDone = true;
                        buffer = buffer.slice(m.index! + m[0].length);
                        if (m[1] === expectedDigest(streamId, secret)) {
                            socket.write('<handshake/>');
                        } else {
                            socket.write(
                                "<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/>" +
                                    '</stream:error></stream:stream>'
                            );
                            socket.end();
                        }
                        return;
                    }
                }

                if (handshakeDone) {
                    state.received += data;
                }
            });
            socket.on('error', () => {
                /* ignore: the client tears the socket down in some tests */
            });
        });

        server.listen(0, '127.0.0.1', () => {
            const port = (server.address() as net.AddressInfo).port;
            resolve({
                port,
                get received() {
                    return state.received;
                },
                push: (xml: string) => clientSocket?.write(xml),
                close: () =>
                    new Promise<void>((res) => {
                        clientSocket?.destroy();
                        server.close(() => res());
                    }),
            });
        });
    });
}

function delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
}

describe('XEP-0114 component transport', () => {
    let conn: InstanceType<typeof Strophe.Connection> | null = null;
    let server: MockServer | null = null;

    afterEach(async () => {
        conn?.disconnect();
        conn = null;
        await server?.close();
        server = null;
        await delay(20);
    });

    it('selects the Component transport for protocol: "component"', () => {
        const c = new Strophe.Connection('tcp://127.0.0.1:5347', { protocol: 'component' });
        expect(c._proto).toBeInstanceOf(Component);
    });

    it('throws for an unknown protocol instead of silently using BOSH', () => {
        // An unregistered protocol (e.g. `component` in a build where it was
        // never registered via addProtocol) must fail loudly at construction.
        expect(() => new Strophe.Connection('tcp://127.0.0.1:5347', { protocol: 'bogus' as 'component' })).toThrow(
            /unknown connection protocol/i
        );
        // Registered transports and the WebSocket/BOSH defaults still construct.
        expect(() => new Strophe.Connection('tcp://127.0.0.1:5347', { protocol: 'component' })).not.toThrow();
        expect(() => new Strophe.Connection('ws://localhost:5280/xmpp', { protocol: 'ws' })).not.toThrow();
        expect(() => new Strophe.Connection('http://localhost/http-bind')).not.toThrow();
    });

    it('completes the handshake and reaches CONNECTED', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        const status = await new Promise<number>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number) => {
                if (s === Strophe.Status.CONNECTED || s === Strophe.Status.AUTHFAIL || s === Strophe.Status.CONNFAIL) {
                    resolve(s);
                }
            });
        });

        expect(status).toBe(Strophe.Status.CONNECTED);
        expect(conn.connected).toBe(true);
        expect(conn.authenticated).toBe(true);
    });

    it('fails cleanly with a wrong shared secret', async () => {
        server = await startMockServer({ secret: 'the-real-secret' });
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        const statuses: number[] = [];
        const finalStatus = await new Promise<number>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, 'a-wrong-secret', (s: number) => {
                statuses.push(s);
                if (s === Strophe.Status.AUTHFAIL || s === Strophe.Status.CONNFAIL) {
                    resolve(s);
                }
            });
        });

        expect(finalStatus).toBe(Strophe.Status.AUTHFAIL);
        expect(conn.authenticated).toBe(false);
        // The connection should ultimately be torn down, and DISCONNECTED must
        // fire exactly once even though the stream error and the closing
        // </stream:stream> arrive back to back in the same chunk.
        await delay(30);
        expect(statuses.filter((s) => s === Strophe.Status.DISCONNECTED)).toHaveLength(1);
    });

    it('fires DISCONNECTED once on a post-handshake stream error', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        const statuses: number[] = [];
        let onDisconnected: () => void;
        const disconnected = new Promise<void>((resolve) => (onDisconnected = resolve));

        await new Promise<void>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number) => {
                statuses.push(s);
                if (s === Strophe.Status.CONNECTED) resolve();
                if (s === Strophe.Status.DISCONNECTED) onDisconnected();
            });
        });

        // The stream error and the closing tag arrive together; the transport
        // must still tear down (and report DISCONNECTED) only once.
        server.push(
            "<stream:error><conflict xmlns='urn:ietf:params:xml:ns:xmpp-streams'/>" + '</stream:error></stream:stream>'
        );

        await disconnected;
        // Give an erroneous second teardown (e.g. from a </stream:stream> in a
        // separate chunk) a chance to fire before counting.
        await delay(20);

        expect(statuses.filter((s) => s === Strophe.Status.DISCONNECTED)).toHaveLength(1);
    });

    it('stamps a `from` under the component domain on outgoing stanzas', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        await new Promise<void>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number) => {
                if (s === Strophe.Status.CONNECTED) resolve();
            });
        });

        conn.send(stx`<message xmlns="jabber:client" to="user@example.org" type="chat"><body>pong</body></message>`);
        await delay(30);

        expect(server.received).toContain('from="component.example.org"');
        expect(server.received).toContain('<body>pong</body>');
    });

    it('preserves an explicit `from` sub-JID on outgoing stanzas', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        await new Promise<void>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number) => {
                if (s === Strophe.Status.CONNECTED) resolve();
            });
        });

        conn.send(
            stx`<message xmlns="jabber:client" from="room@component.example.org" to="user@example.org"><body>hi</body></message>`
        );
        await delay(30);

        expect(server.received).toContain('from="room@component.example.org"');
    });

    it('routes an inbound stanza through addHandler identically to other transports', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        await new Promise<void>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number) => {
                if (s === Strophe.Status.CONNECTED) resolve();
            });
        });

        const received = new Promise<Element>((resolve) => {
            conn!.addHandler(
                (stanza: Element) => {
                    resolve(stanza);
                    return true;
                },
                null,
                'message',
                'chat',
                null,
                null
            );
        });

        server.push(
            `<message xmlns='jabber:component:accept' to='${COMPONENT_DOMAIN}' ` +
                "from='user@example.org' type='chat'><body>ping</body></message>"
        );

        const stanza = await received;
        expect(stanza.nodeName).toBe('message');
        expect(stanza.getAttribute('from')).toBe('user@example.org');
        expect(stanza.getElementsByTagName('body')[0].textContent).toBe('ping');
    });

    it('parses the service into the TCP host and port to dial', () => {
        // Each service string maps to the endpoint the transport connects to.
        const cases: Array<[string, { host: string; port: number }]> = [
            ['tcp://127.0.0.1:5555', { host: '127.0.0.1', port: 5555 }],
            // A bare host:port with no scheme is treated as a TCP component listener.
            ['component.example.org:5350', { host: 'component.example.org', port: 5350 }],
            // With no port given, the conventional component listener port 5347 is used.
            ['tcp://component.example.org', { host: 'component.example.org', port: 5347 }],
        ];
        for (const [service, expected] of cases) {
            const c = new Strophe.Connection(service, { protocol: 'component' });
            expect((c._proto as InstanceType<typeof Component>)._serviceUrl()).toEqual(expected);
        }
    });

    it('reports CONNFAIL and tears down on a malformed inbound stream', async () => {
        server = await startMockServer();
        conn = new Strophe.Connection(`tcp://127.0.0.1:${server.port}`, { protocol: 'component' });

        const statuses: number[] = [];
        let condition: string | null = null;
        let onFailed: () => void;
        const failed = new Promise<void>((resolve) => (onFailed = resolve));

        await new Promise<void>((resolve) => {
            conn!.connect(COMPONENT_DOMAIN, SECRET, (s: number, cond: string) => {
                statuses.push(s);
                if (s === Strophe.Status.CONNECTED) resolve();
                if (s === Strophe.Status.CONNFAIL) {
                    condition = cond;
                    onFailed();
                }
            });
        });

        // Malformed XML on the wire (mismatched tags) must trip the stream
        // parser's onError and fail the connection rather than throw.
        server.push('<message></presence>');

        await failed;
        // Give any erroneous second teardown a chance to fire before counting.
        await delay(20);

        expect(statuses).toContain(Strophe.Status.CONNFAIL);
        expect(condition).toBe('bad-format');
        // A parse failure still tears the connection down exactly once.
        expect(statuses.filter((s) => s === Strophe.Status.DISCONNECTED)).toHaveLength(1);
        expect(conn.connected).toBe(false);
    });
});

describe('ComponentParser (streaming XML)', () => {
    const STREAM_OPEN =
        "<?xml version='1.0'?>" +
        "<stream:stream xmlns:stream='http://etherx.jabber.org/streams' " +
        `xmlns='jabber:component:accept' from='${COMPONENT_DOMAIN}' id='${STREAM_ID}'>`;

    interface Collected {
        parser: ComponentParser;
        stanzas: Element[];
        streamStart: () => Record<string, string> | null;
        ended: () => boolean;
        errors: Error[];
    }

    function collect(): Collected {
        const stanzas: Element[] = [];
        const errors: Error[] = [];
        let streamStart: Record<string, string> | null = null;
        let ended = false;
        const parser = new ComponentParser({
            onStreamStart: (attrs) => (streamStart = attrs),
            onStanza: (s) => stanzas.push(s),
            onStreamEnd: () => (ended = true),
            onError: (e) => errors.push(e),
        });
        return { parser, stanzas, streamStart: () => streamStart, ended: () => ended, errors };
    }

    /** Feed a UTF-8 string into the parser as Buffers of the given byte size. */
    function feed(parser: ComponentParser, str: string, chunkSize: number): void {
        const buf = Buffer.from(str, 'utf8');
        for (let i = 0; i < buf.length; i += chunkSize) {
            parser.write(buf.subarray(i, i + chunkSize));
        }
    }

    it('emits the stream-start event with the stream id', () => {
        const c = collect();
        c.parser.write(Buffer.from(STREAM_OPEN, 'utf8'));
        expect(c.streamStart()).not.toBeNull();
        expect(c.streamStart()!.id).toBe(STREAM_ID);
        expect(c.streamStart()!.from).toBe(COMPONENT_DOMAIN);
    });

    it('emits a whole stanza when delivered byte-by-byte', () => {
        const c = collect();
        const stanza =
            "<message to='u@example.org' from='component.example.org' type='chat'><body>hello</body></message>";
        feed(c.parser, STREAM_OPEN + stanza, 1);

        expect(c.errors).toHaveLength(0);
        expect(c.stanzas).toHaveLength(1);
        expect(c.stanzas[0].nodeName).toBe('message');
        expect(c.stanzas[0].getAttribute('to')).toBe('u@example.org');
        expect(c.stanzas[0].getElementsByTagName('body')[0].textContent).toBe('hello');
    });

    it('reassembles a multi-byte UTF-8 character split across chunk boundaries', () => {
        const c = collect();
        // 'é' is 2 bytes, '😀' is 4 bytes in UTF-8: byte-by-byte feeding splits them.
        const stanza = "<message from='component.example.org'><body>café 😀</body></message>";
        feed(c.parser, STREAM_OPEN + stanza, 1);

        expect(c.errors).toHaveLength(0);
        expect(c.stanzas).toHaveLength(1);
        expect(c.stanzas[0].getElementsByTagName('body')[0].textContent).toBe('café 😀');
    });

    it('emits each of several stanzas exactly once', () => {
        const c = collect();
        const stanzas =
            "<presence from='component.example.org'/>" +
            "<message from='component.example.org'><body>one</body></message>" +
            "<iq from='component.example.org' type='result' id='1'/>";
        // A whitespace keepalive in between stanzas must be ignored.
        feed(c.parser, STREAM_OPEN + '  ' + stanzas + ' ', 3);

        expect(c.errors).toHaveLength(0);
        expect(c.stanzas.map((s) => s.nodeName)).toEqual(['presence', 'message', 'iq']);
    });

    it('handles a stanza split inside an attribute value', () => {
        const c = collect();
        c.parser.write(Buffer.from(STREAM_OPEN, 'utf8'));
        c.parser.write(Buffer.from("<message to='u@examp", 'utf8'));
        c.parser.write(Buffer.from("le.org' from='component.example.org'><body>x</b", 'utf8'));
        c.parser.write(Buffer.from('ody></message>', 'utf8'));

        expect(c.stanzas).toHaveLength(1);
        expect(c.stanzas[0].getAttribute('to')).toBe('u@example.org');
    });

    it('reports the closing stream tag', () => {
        const c = collect();
        c.parser.write(Buffer.from(STREAM_OPEN, 'utf8'));
        expect(c.ended()).toBe(false);
        c.parser.write(Buffer.from('</stream:stream>', 'utf8'));
        expect(c.ended()).toBe(true);
    });

    it('reports a parse error on malformed XML', () => {
        const c = collect();
        c.parser.write(Buffer.from(STREAM_OPEN, 'utf8'));
        c.parser.write(Buffer.from('<message></presence>', 'utf8'));
        expect(c.errors.length).toBeGreaterThan(0);
    });
});
