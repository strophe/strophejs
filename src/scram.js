import utils from './utils';
import { Strophe } from './core.js';

async function scramClientProof( authMessage, clientKey, hashName ) {
    const storedKey = await window.crypto.subtle.importKey(
      "raw",
      await window.crypto.subtle.digest(hashName, clientKey),
      { "name": "HMAC", "hash": hashName },
      false,
      ["sign"]
    );
    const clientSignature = await window.crypto.subtle.sign("HMAC", storedKey, utils.stringToArrayBuf(authMessage));

    return utils.xorArrayBuffers(clientKey, clientSignature);
}

/* This function parses the information in a SASL SCRAM challenge response,
 * into an object of the form
 * { nonce: String,
 *   salt:  ArrayBuffer,
 *   iter:  Int
 * }
 * Returns undefined on failure.
 */
function scramParseChallenge ( challenge ) {
    let nonce, salt, iter;
    const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
    while (challenge.match(attribMatch)) {
        const matches = challenge.match(attribMatch);
        challenge = challenge.replace(matches[0], "");
        switch (matches[1]) {
        case "r":
            nonce = matches[2];
            break;
        case "s":
            salt = utils.base64ToArrayBuf(matches[2]);
            break;
        case "i":
            iter = parseInt(matches[2], 10);
            break;
        default: return undefined;
        }
    }

    // Consider iteration counts less than 4096 insecure, as reccommended by
    // RFC 5802
    if (isNaN(iter) || iter < 4096) {
        Strophe.warn("Failing SCRAM authentication because server supplied iteration count < 4096.");
        return undefined;
    }

    if (!salt) {
        Strophe.warn("Failing SCRAM authentication because server supplied incorrect salt.");
        return undefined;
    }

    return { "nonce": nonce, "salt": salt, "iter": iter };

}

/* Derive the client and server keys given a string password,
 * a hash name, and a bit length.
 * Returns an object of the following form:
 * { ck: ArrayBuffer, the client key
 *   sk: ArrayBuffer, the server key
 * }
 */
async function scramDeriveKeys ( password, salt, iter, hashName, hashBits ) {
    const saltedPasswordBits = await window.crypto.subtle.deriveBits(
        { "name": "PBKDF2", "salt": salt, "iterations": iter, "hash": { "name": hashName } },
        await window.crypto.subtle.importKey("raw", utils.stringToArrayBuf(password), "PBKDF2", false, ["deriveBits"]),
        hashBits
    );
    const saltedPassword = await window.crypto.subtle.importKey(
        "raw",
        saltedPasswordBits,
        { "name": "HMAC", "hash": hashName },
        false,
        ["sign"]
    );

    return { "ck": await window.crypto.subtle.sign("HMAC", saltedPassword, utils.stringToArrayBuf("Client Key")),
             "sk": await window.crypto.subtle.sign("HMAC", saltedPassword, utils.stringToArrayBuf("Server Key"))
           }
}

async function scramServerSign ( authMessage, sk, hashName ) {
    const serverKey = await window.crypto.subtle.importKey(
        "raw",
        sk,
        { "name": "HMAC", "hash": hashName },
        false,
        ["sign"]
    );

    return window.crypto.subtle.sign("HMAC", serverKey, utils.stringToArrayBuf(authMessage));
}

// Generate an ASCII nonce (not containing the ',' character)
function generate_cnonce () {
    // generate 16 random bytes of nonce, base64 encoded
    const bytes = new Uint8Array(16);
    return utils.arrayBufToBase64(crypto.getRandomValues(bytes).buffer);
}

const scram = {

    /* On success, sets
     * connection_sasl_data["server-signature"]
     * and
     * connection._sasl_data.keys
     *
     * The server signature should be verified after this function completes..
     *
     * On failure, returns connection._sasl_failure_cb();
     */
    async scramResponse ( connection, challenge, hashName, hashBits ) {
        const cnonce = connection._sasl_data.cnonce;
        const challengeData = scramParseChallenge(challenge);

        // The RFC requires that we verify the (server) nonce has the client
        // nonce as an initial substring.
        if (!challengeData && challengeData?.nonce.slice(0, cnonce.length) !== cnonce) {
            Strophe.warn("Failing SCRAM authentication because server supplied incorrect nonce.");
            connection._sasl_data = {};
            return connection._sasl_failure_cb();
        }

        let clientKey, serverKey;

        // Either restore the client key and server key passed in, or derive new ones
        if ( connection.pass?.name === hashName &&
             connection.pass?.salt === utils.arrayBufToBase64(challengeData.salt) &&
             connection.pass?.iter === challengeData.iter) {

            clientKey = utils.base64ToArrayBuf(connection.pass.ck);
            serverKey = utils.base64ToArrayBuf(connection.pass.sk);
        } else if (typeof connection.pass === "string" || connection.pass instanceof String) {
            const keys = await scramDeriveKeys(
                connection.pass,
                challengeData.salt,
                challengeData.iter,
                hashName,
                hashBits);
            clientKey = keys.ck;
            serverKey = keys.sk;
        } else {
            return connection._sasl_failure_cb();
        }

        const clientFirstMessageBare = connection._sasl_data["client-first-message-bare"];
        const serverFirstMessage = challenge;
        const clientFinalMessageBare = `c=biws,r=${challengeData.nonce}`;

        const authMessage = `${clientFirstMessageBare},${serverFirstMessage},${clientFinalMessageBare}`;

        const clientProof     = await scramClientProof(authMessage, clientKey, hashName);
        const serverSignature = await scramServerSign(authMessage, serverKey, hashName);

        connection._sasl_data["server-signature"] = utils.arrayBufToBase64(serverSignature);
        connection._sasl_data.keys =
            { "name": hashName,
              "iter": challengeData.iter,
              "salt": utils.arrayBufToBase64(challengeData.salt),
              "ck":   utils.arrayBufToBase64(clientKey),
              "sk":   utils.arrayBufToBase64(serverKey)
            };

        return `${clientFinalMessageBare},p=${utils.arrayBufToBase64(clientProof)}`;
    },

    // Returns a string containing the client first message
    clientChallenge ( connection, test_cnonce ) {
        const cnonce = test_cnonce || generate_cnonce();
        const client_first_message_bare = `n=${connection.authcid},r=${cnonce}`;
        connection._sasl_data.cnonce = cnonce;
        connection._sasl_data["client-first-message-bare"] = client_first_message_bare;
        return `n,,${client_first_message_bare}`;
    }
}

export { scram as default };
