import type Connection from './connection';
import utils from './utils';
import log from './log';

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
                salt = utils.base64ToArrayBuf(matches[2]);
                break;
            case 'i':
                iter = parseInt(matches[2], 10);
                break;
            case 'm':
                return undefined;
            default:
                break;
        }
    }

    if (isNaN(iter) || iter < 4096) {
        log.warn('Failing SCRAM authentication because server supplied iteration count < 4096.');
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
     * On failure, returns connection._sasl_failure_cb();
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
    ): Promise<string | false> {
        const cnonce = connection._sasl_data.cnonce;
        const challengeData = scramParseChallenge(challenge);

        if (!challengeData || challengeData.nonce.slice(0, (cnonce as string).length) !== cnonce) {
            log.warn('Failing SCRAM authentication because server supplied incorrect nonce.');
            connection._sasl_data = {};
            return connection._sasl_failure_cb(null) as false;
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
            return connection._sasl_failure_cb(null) as false;
        }

        const clientFirstMessageBare = connection._sasl_data['client-first-message-bare'];
        const serverFirstMessage = challenge;
        const clientFinalMessageBare = `c=biws,r=${challengeData.nonce}`;

        const authMessage = `${clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;

        const clientProof = await scramClientProof(authMessage, clientKey, hashName);
        const serverSignature = await scramServerSign(authMessage, serverKey, hashName);

        connection._sasl_data['server-signature'] = utils.arrayBufToBase64(serverSignature);
        connection._sasl_data.keys = {
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
};

export { scram as default };
