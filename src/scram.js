/**
 * @typedef {import("./connection.js").default} Connection
 */
import utils from './utils';
import log from './log.js';

/**
 * @param {string} authMessage
 * @param {ArrayBufferLike} clientKey
 * @param {string} hashName
 */
async function scramClientProof(authMessage, clientKey, hashName) {
    const storedKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest(hashName, clientKey),
        { 'name': 'HMAC', 'hash': hashName },
        false,
        ['sign']
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
 * @param {string} challenge
 */
function scramParseChallenge(challenge) {
    let nonce, salt, iter;
    const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
    while (challenge.match(attribMatch)) {
        const matches = challenge.match(attribMatch);
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
                // Mandatory but unknown extension, per RFC 5802 we should abort
                return undefined;
            default:
                // Non-mandatory extension, per RFC 5802 we should ignore it
                break;
        }
    }

    // Consider iteration counts less than 4096 insecure, as reccommended by
    // RFC 5802
    if (isNaN(iter) || iter < 4096) {
        log.warn('Failing SCRAM authentication because server supplied iteration count < 4096.');
        return undefined;
    }

    if (!salt) {
        log.warn('Failing SCRAM authentication because server supplied incorrect salt.');
        return undefined;
    }

    return { 'nonce': nonce, 'salt': salt, 'iter': iter };
}

/**
 * Derive the client and server keys given a string password,
 * a hash name, and a bit length.
 * Returns an object of the following form:
 * { ck: ArrayBuffer, the client key
 *   sk: ArrayBuffer, the server key
 * }
 * @param {string} password
 * @param {BufferSource} salt
 * @param {number} iter
 * @param {string} hashName
 * @param {number} hashBits
 */
async function scramDeriveKeys(password, salt, iter, hashName, hashBits) {
    const saltedPasswordBits = await crypto.subtle.deriveBits(
        { 'name': 'PBKDF2', 'salt': salt, 'iterations': iter, 'hash': { 'name': hashName } },
        await crypto.subtle.importKey('raw', utils.stringToArrayBuf(password), 'PBKDF2', false, ['deriveBits']),
        hashBits
    );
    const saltedPassword = await crypto.subtle.importKey(
        'raw',
        saltedPasswordBits,
        { 'name': 'HMAC', 'hash': hashName },
        false,
        ['sign']
    );

    return {
        'ck': await crypto.subtle.sign('HMAC', saltedPassword, utils.stringToArrayBuf('Client Key')),
        'sk': await crypto.subtle.sign('HMAC', saltedPassword, utils.stringToArrayBuf('Server Key')),
    };
}

/**
 * @param {string} authMessage
 * @param {BufferSource} sk
 * @param {string} hashName
 */
async function scramServerSign(authMessage, sk, hashName) {
    const serverKey = await crypto.subtle.importKey('raw', sk, { 'name': 'HMAC', 'hash': hashName }, false, ['sign']);

    return crypto.subtle.sign('HMAC', serverKey, utils.stringToArrayBuf(authMessage));
}

/**
 * Generate an ASCII nonce (not containing the ',' character)
 * @return {string}
 */
function generate_cnonce() {
    // generate 16 random bytes of nonce, base64 encoded
    const bytes = new Uint8Array(16);
    return utils.arrayBufToBase64(crypto.getRandomValues(bytes).buffer);
}

/**
 * @typedef {Object} Password
 * @property {string} Password.name
 * @property {string} Password.ck
 * @property {string} Password.sk
 * @property {number} Password.iter
 * @property {string} salt
 */

const scram = {
    /**
     * On success, sets
     * connection_sasl_data["server-signature"]
     * and
     * connection._sasl_data.keys
     *
     * The server signature should be verified after this function completes..
     *
     * On failure, returns connection._sasl_failure_cb();
     * @param {Connection} connection
     * @param {string} challenge
     * @param {string} hashName
     * @param {number} hashBits
     */
    async scramResponse(connection, challenge, hashName, hashBits) {
        const cnonce = connection._sasl_data.cnonce;
        const challengeData = scramParseChallenge(challenge);

        // The RFC requires that we verify the (server) nonce has the client
        // nonce as an initial substring.
        if (!challengeData && challengeData?.nonce.slice(0, cnonce.length) !== cnonce) {
            log.warn('Failing SCRAM authentication because server supplied incorrect nonce.');
            connection._sasl_data = {};
            return connection._sasl_failure_cb();
        }

        let clientKey, serverKey;

        const { pass } = connection;

        if (typeof connection.pass === 'string' || connection.pass instanceof String) {
            const keys = await scramDeriveKeys(
                /** @type {string} */ (pass),
                challengeData.salt,
                challengeData.iter,
                hashName,
                hashBits
            );
            clientKey = keys.ck;
            serverKey = keys.sk;
        } else if (
            // Either restore the client key and server key passed in, or derive new ones
            /** @type {Password} */ (pass)?.name === hashName &&
            /** @type {Password} */ (pass)?.salt === utils.arrayBufToBase64(challengeData.salt) &&
            /** @type {Password} */ (pass)?.iter === challengeData.iter
        ) {
            const { ck, sk } = /** @type {Password} */ (pass);
            clientKey = utils.base64ToArrayBuf(ck);
            serverKey = utils.base64ToArrayBuf(sk);
        } else {
            return connection._sasl_failure_cb();
        }

        const clientFirstMessageBare = connection._sasl_data['client-first-message-bare'];
        const serverFirstMessage = challenge;
        const clientFinalMessageBare = `c=biws,r=${challengeData.nonce}`;

        const authMessage = `${clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;

        const clientProof = await scramClientProof(authMessage, clientKey, hashName);
        const serverSignature = await scramServerSign(authMessage, serverKey, hashName);

        connection._sasl_data['server-signature'] = utils.arrayBufToBase64(serverSignature);
        connection._sasl_data.keys = {
            'name': hashName,
            'iter': challengeData.iter,
            'salt': utils.arrayBufToBase64(challengeData.salt),
            'ck': utils.arrayBufToBase64(clientKey),
            'sk': utils.arrayBufToBase64(serverKey),
        };

        return `${clientFinalMessageBare},p=${utils.arrayBufToBase64(clientProof)}`;
    },

    /**
     * Returns a string containing the client first message
     * @param {Connection} connection
     * @param {string} test_cnonce
     */
    clientChallenge(connection, test_cnonce) {
        const cnonce = test_cnonce || generate_cnonce();
        const client_first_message_bare = `n=${connection.authcid},r=${cnonce}`;
        connection._sasl_data.cnonce = cnonce;
        connection._sasl_data['client-first-message-bare'] = client_first_message_bare;
        return `n,,${client_first_message_bare}`;
    },
};

export { scram as default };
