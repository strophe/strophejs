import { Strophe } from '../dist/strophe.node.esm.js';
import { describe, it, expect, vi } from 'vitest';

const { ErrorCondition, Status } = Strophe;

// The RFC 5802 example exchange (user "user", password "pencil").
const CNONCE = 'fyko+d2lbbFgONRv9qkxdawL';
const CHALLENGE = 'r=fyko+d2lbbFgONRv9qkxdawL3rfcNHYJY1ZVvWVs7j,s=QSXCR+Q6sek8bf92,i=4096';
const SERVER_SIGNATURE = 'v=rmF9pqV8S7suAoZWja4dJRkFsKQ=';

function parse(xml: string): Element {
    return new DOMParser().parseFromString(xml, 'text/xml').documentElement;
}

/**
 * A connection that has started SCRAM-SHA-1 with the RFC 5802 client nonce,
 * recording what it sends and the statuses it reports.
 */
function startScram(pass: string | object = 'pencil') {
    const conn = new Strophe.Connection('wss://example.org/xmpp-websocket');
    const sent: Element[] = [];
    const statuses: [number, string | null, Element | null | undefined][] = [];
    vi.spyOn(conn, 'send').mockImplementation((el: any) => sent.push(el.tree?.() ?? el));
    Object.assign(conn, { jid: 'user@example.org', authzid: 'user@example.org', authcid: 'user', pass });
    conn.connect_callback = (status: number, condition: string | null, elem?: Element) => {
        statuses.push([status, condition, elem]);
    };
    conn._attemptSASLAuth([new Strophe.SASLSHA1()]);
    conn._sasl_data.cnonce = CNONCE;
    conn._sasl_data['client-first-message-bare'] = `n=user,r=${CNONCE}`;
    sent.length = 0;
    const recv = (xml: string) => conn._dataRecv(parse(`<wrapper>${xml}</wrapper>`));
    return { conn, sent, statuses, recv };
}

/** Pretend the stream is up, so that disconnect() closes it. */
function connected(conn: any) {
    conn.connected = true;
    return vi.spyOn(conn._proto, '_disconnect').mockImplementation(() => {});
}

const challenge = (data: string) => `<challenge xmlns="${Strophe.NS.SASL}">${btoa(data)}</challenge>`;
const success = (data: string) => `<success xmlns="${Strophe.NS.SASL}">${btoa(data)}</success>`;
const aborted = `<failure xmlns="${Strophe.NS.SASL}"><aborted/></failure>`;

describe('SCRAM failures on the client side', () => {
    it.each([
        [
            'an insecure challenge',
            'r=fyko+d2lbbFgONRv9qkxdawL3rfc,s=QSXCR+Q6sek8bf92,i=1000',
            'pencil',
            'SCRAM_BAD_CHALLENGE',
        ],
        [
            'a nonce that does not extend ours',
            'r=someoneelse3rfc,s=QSXCR+Q6sek8bf92,i=4096',
            'pencil',
            'SCRAM_BAD_NONCE',
        ],
        ['a salt that is not base64', 'r=fyko+d2lbbFgONRv9qkxdawL3rfc,s=@@@,i=4096', 'pencil', 'SCRAM_BAD_CHALLENGE'],
        ['a nonce with no server part', `r=${CNONCE},s=QSXCR+Q6sek8bf92,i=4096`, 'pencil', 'SCRAM_BAD_NONCE'],
        [
            'stored keys for another salt',
            CHALLENGE,
            { name: 'SHA-1', salt: 'b3RoZXJzYWx0', iter: 4096, ck: 'AAAA', sk: 'AAAA' },
            'SCRAM_STALE_KEYS',
        ],
    ])('abort the exchange on %s and report one AUTHFAIL', async (_, data, pass, condition) => {
        const { sent, statuses, recv } = startScram(pass);
        recv(challenge(data));
        await vi.waitFor(() => expect(statuses).toHaveLength(1));

        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition[condition], null]);
        expect(sent).toHaveLength(1);
        expect(sent[0].nodeName).toBe('abort');
        expect(sent[0].getAttribute('xmlns')).toBe(Strophe.NS.SASL);

        // The server confirms the abort, which isn't reported again.
        recv(aborted);
        expect(statuses).toHaveLength(1);
    });

    it("doesn't fail a retry with the server's reply to the abort", async () => {
        const { conn, statuses, recv } = startScram({
            name: 'SHA-1',
            salt: 'b3RoZXJzYWx0',
            iter: 4096,
            ck: 'AAAA',
            sk: 'AAAA',
        });
        // The app retries with the password as soon as it hears of the stale keys.
        conn.domain = 'example.org';
        conn.connect_callback = (status: number, condition: string | null, elem?: Element) => {
            statuses.push([status, condition, elem]);
            if (status === Status.AUTHFAIL) {
                conn.pass = 'pencil';
                conn._attemptSASLAuth([new Strophe.SASLPlain()]);
            }
        };
        recv(challenge(CHALLENGE));
        await vi.waitFor(() => expect(statuses).toHaveLength(1));
        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_STALE_KEYS, null]);

        // The reply to the old exchange's <abort/> arrives after the retry started.
        recv(aborted);
        expect(statuses).toHaveLength(1);

        // The retry is still running, and a real failure of it is reported.
        recv(`<failure xmlns="${Strophe.NS.SASL}"><not-authorized/></failure>`);
        expect(statuses).toHaveLength(2);
        expect(statuses[1][0]).toBe(Status.AUTHFAIL);
        expect(statuses[1][2]?.firstElementChild?.nodeName).toBe('not-authorized');
    });

    it('aborts with UNKNOWN_REASON when the challenge is not base64', async () => {
        const { sent, statuses, recv } = startScram();
        recv(`<challenge xmlns="${Strophe.NS.SASL}">not*base64</challenge>`);
        await vi.waitFor(() => expect(statuses).toHaveLength(1));

        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition.UNKNOWN_REASON, null]);
        expect(sent.map((el) => el.nodeName)).toEqual(['abort']);
    });

    it.each([
        ['is wrong', () => success('v=AAAAAAAAAAAAAAAAAAAAAAAAAAA=')],
        ['is a server error', () => success('e=invalid-proof')],
        ['is not base64', () => `<success xmlns="${Strophe.NS.SASL}">not*base64</success>`],
    ])('fails and disconnects when the server signature %s', async (_, successXml) => {
        const { conn, sent, statuses, recv } = startScram();
        const close = connected(conn);
        recv(challenge(CHALLENGE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0].nodeName).toBe('response');

        recv(successXml());
        // The disconnect starts before AUTHFAIL is reported.
        expect(statuses).toEqual([
            [Status.DISCONNECTING, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, undefined],
            [Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, null],
        ]);
        expect(close).toHaveBeenCalledTimes(1);
        expect(conn.scram_keys).toBeFalsy();
    });

    it('fails and disconnects on <success> before any challenge was answered', () => {
        const { conn, statuses, recv } = startScram();
        const close = connected(conn);

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(statuses.map(([status]) => status)).toEqual([Status.DISCONNECTING, Status.AUTHFAIL]);
        expect(statuses[1]).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, null]);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes the stream once if the app disconnects on AUTHFAIL', () => {
        const { conn, statuses, recv } = startScram();
        const close = connected(conn);
        conn.connect_callback = (status: number, condition: string | null, elem?: Element) => {
            statuses.push([status, condition, elem]);
            if (status === Status.AUTHFAIL) conn.disconnect();
        };

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(close).toHaveBeenCalledTimes(1);
        expect(statuses.filter(([status]) => status === Status.DISCONNECTING)).toHaveLength(1);
    });

    it("doesn't disconnect after the app's AUTHFAIL callback", () => {
        const { conn, recv } = startScram();
        connected(conn);
        const disconnect = vi.spyOn(conn, 'disconnect');
        let calls_at_authfail = -1;
        conn.connect_callback = (status: number) => {
            // An app that reconnects here must not have its new stream closed.
            if (status === Status.AUTHFAIL) calls_at_authfail = disconnect.mock.calls.length;
        };

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(calls_at_authfail).toBe(1);
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('drops the answer to a challenge if the server failed the exchange meanwhile', async () => {
        const { conn, sent, statuses, recv } = startScram();
        recv(challenge(CHALLENGE));
        recv(`<failure xmlns="${Strophe.NS.SASL}"><not-authorized/></failure>`);
        expect(statuses).toHaveLength(1);
        expect(statuses[0][0]).toBe(Status.AUTHFAIL);

        // Let the key derivation finish.
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(sent).toEqual([]);
        expect(conn._sasl_data).toEqual({});
    });

    it("doesn't let a stale answer touch a newer exchange", async () => {
        const { conn, sent, statuses, recv } = startScram();
        // A challenge whose answer can't be computed, so the old exchange would abort.
        const pending = conn._sasl_challenge_cb(parse(challenge('r=someoneelse3rfc,s=QSXCR+Q6sek8bf92,i=4096')));
        conn.domain = 'example.org';
        conn._attemptSASLAuth([new Strophe.SASLPlain()]);
        sent.length = 0;

        await pending;
        expect(sent).toEqual([]);
        expect(statuses).toEqual([]);

        // The new PLAIN exchange succeeds without a server signature.
        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(statuses).toEqual([]);
    });

    it("removes the old exchange's handlers when a new exchange starts", () => {
        const { conn, statuses, recv } = startScram();
        conn.domain = 'example.org';
        conn._attemptSASLAuth([new Strophe.SASLPlain()]);

        recv(`<failure xmlns="${Strophe.NS.SASL}"><not-authorized/></failure>`);
        expect(statuses).toHaveLength(1);
        expect(statuses[0][0]).toBe(Status.AUTHFAIL);
    });

    it('binds once when a restarted exchange succeeds', () => {
        const { conn, recv } = startScram();
        const features = vi.spyOn(conn, '_onStreamFeaturesAfterSASL').mockImplementation(() => false);
        conn.domain = 'example.org';
        conn._attemptSASLAuth([new Strophe.SASLPlain()]);

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        recv(`<stream:features xmlns:stream="http://etherx.jabber.org/streams"/>`);
        expect(features).toHaveBeenCalledTimes(1);
    });

    it('ignores a challenge that follows a failure in the same batch', async () => {
        const { sent, statuses, recv } = startScram();
        recv(`<failure xmlns="${Strophe.NS.SASL}"><not-authorized/></failure>${challenge(CHALLENGE)}`);
        expect(statuses).toHaveLength(1);

        // Let the key derivation finish, if it was started.
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(sent).toEqual([]);
        expect(statuses).toHaveLength(1);
    });

    it.each([
        ['a SASLError', () => new Strophe.SASLError(ErrorCondition.SCRAM_BAD_CHALLENGE, 'no'), 'SCRAM_BAD_CHALLENGE'],
        ['any other error', () => new Error('no'), 'UNKNOWN_REASON'],
    ])('fails the exchange when the first client message throws %s', (_, error, condition) => {
        class Throwing extends Strophe.SASLMechanism {
            constructor() {
                super('X-THROWING', true, 100);
            }
            onChallenge(): string {
                throw error();
            }
        }
        const { conn, sent, statuses, recv } = startScram();
        sent.length = 0;
        const legacy = vi.spyOn(conn, '_attemptLegacyAuth');

        conn.authenticate([new Throwing()]);
        // No <auth> went out, so there's nothing to abort.
        expect(sent).toEqual([]);
        expect(legacy).not.toHaveBeenCalled();
        expect(statuses).toEqual([[Status.AUTHFAIL, ErrorCondition[condition], null]]);

        // No handler of the failed exchange is left.
        recv(`<failure xmlns="${Strophe.NS.SASL}"><not-authorized/></failure>`);
        expect(statuses).toHaveLength(1);
    });

    it("doesn't check a SCRAM signature for another mechanism that keeps a cnonce", () => {
        class Nonced extends Strophe.SASLMechanism {
            constructor() {
                super('X-NONCED', false, 100);
            }
            onStart(connection: any) {
                super.onStart(connection);
                connection._sasl_data.cnonce = 'abc';
            }
        }
        const { conn, statuses, recv } = startScram();
        connected(conn);
        const features = vi.spyOn(conn, '_onStreamFeaturesAfterSASL').mockImplementation(() => false);
        conn._attemptSASLAuth([new Nonced()]);

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        recv(`<stream:features xmlns:stream="http://etherx.jabber.org/streams"/>`);
        expect(statuses).toEqual([]);
        expect(features).toHaveBeenCalledTimes(1);
    });

    it.each([
        [
            'throws a SASLError',
            () => {
                throw new Strophe.SASLError('x-custom', 'no');
            },
            'x-custom',
        ],
        ['returns false', () => false, ErrorCondition.UNKNOWN_REASON],
    ])("fails and disconnects when a mechanism's verifySuccess() %s", (_, verify, condition) => {
        class Picky extends Strophe.SASLMechanism {
            constructor() {
                super('X-PICKY', false, 100);
            }
            verifySuccess(): boolean {
                return verify();
            }
        }
        const { conn, statuses, recv } = startScram();
        const close = connected(conn);
        conn._attemptSASLAuth([new Picky()]);

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(statuses).toEqual([
            [Status.DISCONNECTING, condition, undefined],
            [Status.AUTHFAIL, condition, null],
        ]);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('accepts the right server signature', async () => {
        const { conn, sent, statuses, recv } = startScram();
        recv(challenge(CHALLENGE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));

        recv(success(SERVER_SIGNATURE));
        expect(statuses).toEqual([]);
        expect(conn.scram_keys?.name).toBe('SHA-1');
    });
});

// A server that doesn't send additional data with <success> sends the
// server-final message as a challenge instead (RFC 6120 § 6.3.10).
describe('A SCRAM server signature sent in a challenge', () => {
    /** Answers the first challenge, so that the server-final message is next. */
    async function answerFirstChallenge(scram: ReturnType<typeof startScram>) {
        scram.recv(challenge(CHALLENGE));
        await vi.waitFor(() => expect(scram.sent).toHaveLength(1));
        scram.sent.length = 0;
    }

    it('is answered with an empty response, and an empty <success/> then authenticates', async () => {
        const scram = startScram();
        const { conn, sent, statuses, recv } = scram;
        await answerFirstChallenge(scram);

        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0].nodeName).toBe('response');
        expect(sent[0].textContent).toBe('');

        recv(`<success xmlns="${Strophe.NS.SASL}"/>`);
        expect(statuses).toEqual([]);
        expect(conn.scram_keys?.name).toBe('SHA-1');
    });

    it.each([
        ['zero-length (=)', `<success xmlns="${Strophe.NS.SASL}">=</success>`],
        ['whitespace', `<success xmlns="${Strophe.NS.SASL}">\n  </success>`],
    ])('then authenticates on a <success> whose data is %s', async (_, xml) => {
        const scram = startScram();
        const { conn, sent, statuses, recv } = scram;
        await answerFirstChallenge(scram);
        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));

        recv(xml);
        expect(statuses).toEqual([]);
        expect(conn.scram_keys?.name).toBe('SHA-1');
    });

    it('fails and disconnects on <success>=</success> if no signature was verified', async () => {
        const scram = startScram();
        const { conn, statuses, recv } = scram;
        const close = connected(conn);
        await answerFirstChallenge(scram);

        recv(`<success xmlns="${Strophe.NS.SASL}">=</success>`);
        expect(statuses.at(-1)).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, null]);
        expect(close).toHaveBeenCalledTimes(1);
        expect(conn.scram_keys).toBeFalsy();
    });

    it('fails and disconnects, without an <abort/>, when it is wrong', async () => {
        const scram = startScram();
        const { conn, sent, statuses, recv } = scram;
        const close = connected(conn);
        await answerFirstChallenge(scram);

        recv(challenge('v=AAAAAAAAAAAAAAAAAAAAAAAAAAA='));
        await vi.waitFor(() => expect(statuses).toHaveLength(2));
        expect(statuses).toEqual([
            [Status.DISCONNECTING, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, undefined],
            [Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, null],
        ]);
        expect(close).toHaveBeenCalledTimes(1);
        expect(sent).toEqual([]);
        expect(conn.scram_keys).toBeFalsy();
    });

    it.each([
        ['is a server error', 'e=invalid-proof'],
        ['is another server-first message', CHALLENGE],
    ])('aborts with SCRAM_BAD_CHALLENGE, and keeps the stream, when it %s', async (_, data) => {
        const scram = startScram();
        const { conn, sent, statuses, recv } = scram;
        const close = connected(conn);
        await answerFirstChallenge(scram);

        recv(challenge(data));
        await vi.waitFor(() => expect(statuses).toHaveLength(1));
        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_CHALLENGE, null]);
        expect(sent.map((el) => el.nodeName)).toEqual(['abort']);
        expect(close).not.toHaveBeenCalled();
        expect(conn.scram_keys).toBeFalsy();
    });

    it('fails and disconnects when <success> then carries another signature', async () => {
        const scram = startScram();
        const { conn, sent, statuses, recv } = scram;
        const close = connected(conn);
        await answerFirstChallenge(scram);
        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));

        recv(success('v=AAAAAAAAAAAAAAAAAAAAAAAAAAA='));
        expect(statuses).toEqual([
            [Status.DISCONNECTING, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, undefined],
            [Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, null],
        ]);
        expect(close).toHaveBeenCalledTimes(1);
        expect(conn.scram_keys).toBeFalsy();
    });

    it('aborts with SCRAM_BAD_CHALLENGE when it comes before the first challenge', async () => {
        const { sent, statuses, recv } = startScram();
        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(statuses).toHaveLength(1));

        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_CHALLENGE, null]);
        expect(sent.map((el) => el.nodeName)).toEqual(['abort']);
    });

    it('aborts with SCRAM_BAD_CHALLENGE on a challenge after it', async () => {
        const scram = startScram();
        const { sent, statuses, recv } = scram;
        await answerFirstChallenge(scram);
        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(sent).toHaveLength(1));

        recv(challenge(SERVER_SIGNATURE));
        await vi.waitFor(() => expect(statuses).toHaveLength(1));
        expect(statuses[0]).toEqual([Status.AUTHFAIL, ErrorCondition.SCRAM_BAD_CHALLENGE, null]);
        expect(sent.map((el) => el.nodeName)).toEqual(['response', 'abort']);
    });
});
