import type Connection from './connection.js';
import utils, { getText } from './utils.js';
import log from './log.js';
import { ErrorCondition } from './constants.js';
import { SASLError } from './errors.js';

interface ScramChallengeData {
    nonce: string;
    salt: ArrayBuffer;
    iter: number;
}

interface Password {
    name: string;
    ck: string;
    sk: string;
    iter: number;
    salt: string;
}

interface DerivedKeys {
    ck: ArrayBuffer;
    sk: ArrayBuffer;
}

/** Fewer iterations than this make the password too cheap to brute-force. */
const MIN_ITERATIONS = 4096;

/**
 * More iterations than this are refused, because the key derivation can't be
 * cancelled and a server could otherwise keep the client busy for hours. It's
 * far above what servers use (typically 4096 to around a million).
 */
const MAX_ITERATIONS = 10_000_000;

/**
 * @param authMessage
 * @param clientKey
 * @param hashName
 */
async function scramClientProof(authMessage: string, clientKey: ArrayBuffer, hashName: string): Promise<ArrayBuffer> {
    const storedKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest(hashName, clientKey),
        { name: 'HMAC', hash: hashName },
        false,
        ['sign'],
    );
    const clientSignature = await crypto.subtle.sign('HMAC', storedKey, utils.stringToArrayBuf(authMessage));

    return utils.xorArrayBuffers(clientKey, clientSignature);
}

/**
 * This function parses the information in a SASL SCRAM challenge response,
 * into an object of the form
 * { nonce: String,
 *   salt:  ArrayBuffer,
 *   iter:  Int
 * }
 * Returns undefined on failure.
 * @param challenge
 */
function scramParseChallenge(challenge: string): ScramChallengeData | undefined {
    let nonce: string, salt: ArrayBuffer, iter: number;
    const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
    while (challenge.match(attribMatch)) {
        const matches = challenge.match(attribMatch)!;
        challenge = challenge.replace(matches[0], '');
        switch (matches[1]) {
            case 'r':
                nonce = matches[2];
                break;
            case 's':
                try {
                    salt = utils.base64ToArrayBuf(matches[2]);
                } catch {
                    log.warn('Failing SCRAM authentication because the salt is not valid base64.');
                    return undefined;
                }
                break;
            case 'i':
                // digits only (RFC 5802 § 7), which parseInt() doesn't insist on
                iter = /^[1-9]\d*$/.test(matches[2]) ? Number(matches[2]) : NaN;
                break;
            case 'm':
                return undefined;
            default:
                break;
        }
    }

    if (isNaN(iter) || iter < MIN_ITERATIONS) {
        log.warn(`Failing SCRAM authentication because server supplied iteration count < ${MIN_ITERATIONS}.`);
        return undefined;
    }

    if (iter > MAX_ITERATIONS) {
        log.warn(`Failing SCRAM authentication because server supplied iteration count > ${MAX_ITERATIONS}.`);
        return undefined;
    }

    if (!salt) {
        log.warn('Failing SCRAM authentication because server supplied incorrect salt.');
        return undefined;
    }

    return { nonce, salt, iter };
}

/**
 * Derive the client and server keys given a string password,
 * a hash name, and a bit length.
 * @param password
 * @param salt
 * @param iter
 * @param hashName
 * @param hashBits
 */
async function scramDeriveKeys(
    password: string,
    salt: BufferSource,
    iter: number,
    hashName: string,
    hashBits: number,
): Promise<DerivedKeys> {
    const saltedPasswordBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: iter, hash: { name: hashName } },
        await crypto.subtle.importKey('raw', utils.stringToArrayBuf(password), 'PBKDF2', false, ['deriveBits']),
        hashBits,
    );
    const saltedPassword = await crypto.subtle.importKey(
        'raw',
        saltedPasswordBits,
        { name: 'HMAC', hash: hashName },
        false,
        ['sign'],
    );

    return {
        ck: await crypto.subtle.sign('HMAC', saltedPassword, utils.stringToArrayBuf('Client Key')),
        sk: await crypto.subtle.sign('HMAC', saltedPassword, utils.stringToArrayBuf('Server Key')),
    };
}

/**
 * @param authMessage
 * @param sk
 * @param hashName
 */
async function scramServerSign(authMessage: string, sk: BufferSource, hashName: string): Promise<ArrayBuffer> {
    const serverKey = await crypto.subtle.importKey('raw', sk, { name: 'HMAC', hash: hashName }, false, ['sign']);

    return crypto.subtle.sign('HMAC', serverKey, utils.stringToArrayBuf(authMessage));
}

/**
 * Generate an ASCII nonce (not containing the ',' character)
 * @returns
 */
function generate_cnonce(): string {
    const bytes = new Uint8Array(16);
    return utils.arrayBufToBase64(crypto.getRandomValues(bytes).buffer);
}

/**
 * @param message - A SCRAM server-final message.
 * @returns The server signature (the `v` attribute), if there is one.
 */
function scramServerSignature(message: string): string | undefined {
    return message.match(/(?:^|,)v=([^,]+)/)?.[1];
}

/**
 * Checks the server-final message of a server that sends it in a challenge,
 * instead of as additional data with `<success>` (RFC 6120 § 6.3.10).
 * @param data - The data of the SASL exchange.
 * @param challenge
 * @returns The empty response that such a challenge is answered with.
 * @throws {SASLError} With `SCRAM_BAD_CHALLENGE` if the message has no
 *  signature (e.g. it's a server error, `e=`), and `SCRAM_BAD_SERVER_SIGNATURE`
 *  if the signature is wrong. The latter closes the stream, since the server
 *  already has our proof and hasn't shown that it knows the password.
 */
function scramFinalResponse(data: Connection['_sasl_data'], challenge: string): '' {
    if (data['server-signature-verified']) {
        throw new SASLError(ErrorCondition.SCRAM_BAD_CHALLENGE, 'The SCRAM exchange is already complete.');
    }
    const signature = scramServerSignature(challenge);
    if (!signature) {
        log.warn(`Failing SCRAM authentication because the server-final message has no signature: ${challenge}`);
        throw new SASLError(ErrorCondition.SCRAM_BAD_CHALLENGE, 'The server-final message has no signature.');
    }
    if (signature !== data['server-signature']) {
        log.warn('Failing SCRAM authentication because the server signature is wrong.');
        throw new SASLError(ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, 'The server signature is wrong.', {
            disconnect: true,
        });
    }
    data['server-signature-verified'] = true;
    return '';
}

const scram = {
    /**
     * Whether the Web Crypto `SubtleCrypto` API that SCRAM relies on is available.
     */
    supported(): boolean {
        return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
    },

    /**
     * On success, sets
     * connection_sasl_data["server-signature"]
     * and
     * connection._sasl_data.keys
     *
     * The server signature should be verified after this function completes..
     *
     * A later challenge is taken to be the server-final message, which a
     * server may send that way instead of in `<success>`. It is answered with
     * an empty response if its signature is right.
     *
     * On failure, throws a `SASLError` saying why, and the connection aborts
     * the SASL exchange (or closes the stream, on a wrong server signature).
     * @param connection
     * @param challenge
     * @param hashName
     * @param hashBits
     */
    async scramResponse(
        connection: Connection,
        challenge: string,
        hashName: string,
        hashBits: number,
    ): Promise<string> {
        // Write results to this exchange's data, even if a new exchange has
        // started by the time the keys are derived.
        const data = connection._sasl_data;
        if (data['server-signature']) return scramFinalResponse(data, challenge);
        // The signature is only known once the keys are derived, so mark the
        // first challenge as seen right away. Another one that arrives in the
        // meantime can't be the server-final message, nor a second server-first.
        if (data['challenge-seen']) {
            log.warn('Failing SCRAM authentication because a challenge arrived before the first was answered.');
            throw new SASLError(
                ErrorCondition.SCRAM_BAD_CHALLENGE,
                'A challenge arrived before the first was answered.',
            );
        }
        data['challenge-seen'] = true;

        const cnonce = data.cnonce as string;
        const challengeData = scramParseChallenge(challenge);

        if (!challengeData) {
            throw new SASLError(ErrorCondition.SCRAM_BAD_CHALLENGE, 'The SCRAM challenge is malformed or insecure.');
        }
        // The server must extend our nonce with its own part (RFC 5802 § 5.1).
        const { nonce } = challengeData;
        if (!cnonce || !nonce?.startsWith(cnonce) || nonce.length <= cnonce.length) {
            log.warn('Failing SCRAM authentication because server supplied incorrect nonce.');
            throw new SASLError(ErrorCondition.SCRAM_BAD_NONCE, "The server's nonce doesn't extend ours.");
        }

        let clientKey: ArrayBuffer, serverKey: ArrayBuffer;

        const { pass } = connection;

        if (typeof connection.pass === 'string' || connection.pass instanceof String) {
            const keys = await scramDeriveKeys(
                pass as string,
                challengeData.salt,
                challengeData.iter,
                hashName,
                hashBits,
            );
            clientKey = keys.ck;
            serverKey = keys.sk;
        } else if (
            (pass as Password)?.name === hashName &&
            (pass as Password)?.salt === utils.arrayBufToBase64(challengeData.salt) &&
            (pass as Password)?.iter === challengeData.iter
        ) {
            const { ck, sk } = pass as Password;
            clientKey = utils.base64ToArrayBuf(ck);
            serverKey = utils.base64ToArrayBuf(sk);
        } else {
            log.warn("Failing SCRAM authentication because the stored keys don't match the server's challenge.");
            throw new SASLError(ErrorCondition.SCRAM_STALE_KEYS, "The stored keys don't match the challenge.");
        }

        const clientFirstMessageBare = data['client-first-message-bare'];
        const serverFirstMessage = challenge;
        const clientFinalMessageBare = `c=biws,r=${challengeData.nonce}`;

        const authMessage = `${clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;

        const clientProof = await scramClientProof(authMessage, clientKey, hashName);
        const serverSignature = await scramServerSign(authMessage, serverKey, hashName);

        data['server-signature'] = utils.arrayBufToBase64(serverSignature);
        data.keys = {
            name: hashName,
            iter: challengeData.iter,
            salt: utils.arrayBufToBase64(challengeData.salt),
            ck: utils.arrayBufToBase64(clientKey),
            sk: utils.arrayBufToBase64(serverKey),
        };

        return `${clientFinalMessageBare},p=${utils.arrayBufToBase64(clientProof)}`;
    },

    /**
     * Returns a string containing the client first message
     * @param connection
     * @param test_cnonce
     */
    clientChallenge(connection: Connection, test_cnonce?: string): string {
        const cnonce = test_cnonce || generate_cnonce();
        const client_first_message_bare = `n=${connection.authcid},r=${cnonce}`;
        connection._sasl_data.cnonce = cnonce;
        connection._sasl_data['client-first-message-bare'] = client_first_message_bare;
        return utils.utf16to8(`n,,${client_first_message_bare}`);
    },

    /**
     * Checks that a `<success>` carries the server signature computed while
     * answering the server's challenge, so that the server has proven it
     * knows the password (RFC 5802 § 3).
     *
     * A `<success>` without additional data (empty, or `=` for zero-length
     * data, RFC 6120 § 6.3.10) is accepted if the server already sent the
     * right signature in a challenge.
     * @param connection
     * @param elem - The `<success>` element.
     * @throws {SASLError} With `SCRAM_BAD_SERVER_SIGNATURE` if no challenge
     *  was answered, or the signature is missing, malformed or wrong.
     */
    verifySuccess(connection: Connection, elem: Element): true {
        const expected = connection._sasl_data['server-signature'];
        const text = (getText(elem) ?? '').trim();
        let verified: boolean;
        if (text === '' || text === '=') {
            // no additional data, so the signature must have come in a challenge
            verified = !!connection._sasl_data['server-signature-verified'];
        } else {
            let signature: string | undefined;
            try {
                signature = scramServerSignature(atob(text));
            } catch {
                // not base64, so no signature
            }
            verified = signature === expected;
        }
        if (!expected || !verified) {
            throw new SASLError(ErrorCondition.SCRAM_BAD_SERVER_SIGNATURE, 'The server signature is missing or wrong.');
        }
        return true;
    },
};

export { scram as default };
