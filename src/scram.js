import utils from './utils';

async function scramClientProof( authMessage, clientKey, hashName ) {
    let enc = new TextEncoder();

    const storedKey = await window.crypto.subtle.importKey(
      "raw",
      await window.crypto.subtle.digest(hashName, clientKey),
      { "name": "HMAC", "hash": hashName },
      false,
      ["sign"]
    );
    const clientSignature = await window.crypto.subtle.sign("HMAC", storedKey, enc.encode(authMessage));

    return utils.xorArrayBuffers(clientKey, clientSignature);
}

function scramParseChallenge ( challenge ) {
    /* This function parses the information in a SASL SCRAM challenge response,
     * into an object of the form
     * { nonce: String,
     *   salt:  ArrayBuffer,
     *   iter:  Int
     * }
     * Returns undefined on failure.
     */
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
            iter = parseInt(matches[2]);
            break;
        default: return undefined;
        }
    }

    // Consider iteration counts less than 4096 insecure, as reccommended by
    // RFC 5802
    if (isNaN(iter) || iter < 4096) {
        return undefined;
    }

    if (!salt) {
        return undefined;
    }

    return { "nonce": nonce, "salt": salt, "iter": iter };

}

async function scramDeriveKeys ( password, salt, iter, hashName, hashBits ) {
    /* Derive the client and server keys given a string password,
     * a hash name, and a bit length.
     * Returns an object of the following form:
     * { ck: ArrayBuffer, the client key
     *   sk: ArrayBuffer, the server key
     * }
     */

    let enc = new TextEncoder();

    const saltedPasswordBits = await window.crypto.subtle.deriveBits(
        { "name": "PBKDF2", "salt": salt, "iterations": iter, "hash": { "name": hashName } },
        await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]),
        hashBits
    );
    const saltedPassword = await window.crypto.subtle.importKey(
        "raw",
        saltedPasswordBits,
        { "name": "HMAC", "hash": hashName },
        false,
        ["sign"]
    );

    return { "ck": await window.crypto.subtle.sign("HMAC", saltedPassword, enc.encode("Client Key").buffer),
             "sk": await window.crypto.subtle.sign("HMAC", saltedPassword, enc.encode("Server Key").buffer)
           }
}

async function scramServerSign ( authMessage, sk, hashName ) {
    let enc = new TextEncoder();

    const serverKey = await window.crypto.subtle.importKey(
        "raw",
        sk,
        { "name": "HMAC", "hash": hashName },
        false,
        ["sign"]
    );

    return await window.crypto.subtle.sign("HMAC", serverKey, enc.encode(authMessage));
}

async function scramResponse ( connection, challenge, hashName, hashBits ) {
        /* On success, sets
         * connection_sasl_data["server-signature"]
         * and
         * connection._sasl_data.keys
         *
         * The server signature should be verified after this function completes..
         *
         * On failure, returns connection._sasl_failure_cb();
         */
        const cnonce = connection._sasl_data.cnonce;
        const challengeData = scramParseChallenge(challenge);

        // The RFC requires that we verify the (server) nonce has the client
        // nonce as an initial substring.
        if (!challengeData && challengeData?.nonce.slice(0, cnonce.length) !== cnonce) {
            connection._sasl_data = {};
            return connection._sasl_failure_cb();
        }

        let clientKey, serverKey;

        // Either restore the client key and server key passed in, or derive new ones
        if ( connection.pass?.name === hashName &&
             connection.pass?.salt === challengeData.salt &&
             connection.pass?.iter === challengeData.iter) {

            clientKey = utils.base64ToArrayBuf(connection.pass.ck);
            serverKey = utils.base64ToArrayBuf(connection.pass.sk);
        } else if (typeof connection.pass === "string" || connection.pass instanceof String) {
            let keys = await scramDeriveKeys(
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
              "ck":   utils.arrayBufToBase64(clientKey),
              "sk":   utils.arrayBufToBase64(serverKey)
            };

        return `${clientFinalMessageBare},p=${utils.arrayBufToBase64(clientProof)}`;
}

export { scramResponse as default };

