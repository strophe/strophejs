import MD5 from './md5';
import SASLMechanism from './sasl.js';
import SHA1 from './sha1';
import utils from './utils';


export default class SASLSHA1 extends SASLMechanism {

    /** PrivateConstructor: SASLSHA1
     *  SASL SCRAM SHA 1 authentication.
     */
    constructor (mechname='SCRAM-SHA-1', isClientFirst=true, priority=60) {
        super(mechname, isClientFirst, priority);
    }

    test (connection) { // eslint-disable-line class-methods-use-this
        return connection.authcid !== null;
    }

    onChallenge (connection, challenge) { // eslint-disable-line class-methods-use-this
       let nonce, salt, iter, Hi, U, U_old, i, k;
       let responseText = "c=biws,";
       let authMessage = `${connection._sasl_data["client-first-message-bare"]},${challenge},`;
       const cnonce = connection._sasl_data.cnonce;
       const attribMatch = /([a-z]+)=([^,]+)(,|$)/;

       while (challenge.match(attribMatch)) {
           const matches = challenge.match(attribMatch);
           challenge = challenge.replace(matches[0], "");
           switch (matches[1]) {
           case "r":
               nonce = matches[2];
               break;
           case "s":
               salt = matches[2];
               break;
           case "i":
               iter = matches[2];
               break;
           }
       }

       if (nonce.slice(0, cnonce.length) !== cnonce) {
           connection._sasl_data = {};
           return connection._sasl_failure_cb();
       }

       responseText += "r=" + nonce;
       authMessage += responseText;

       salt = atob(salt);
       salt += "\x00\x00\x00\x01";

       const pass = utils.utf16to8(connection.pass);
       Hi = U_old = SHA1.core_hmac_sha1(pass, salt);
       for (i=1; i<iter; i++) {
           U = SHA1.core_hmac_sha1(pass, SHA1.binb2str(U_old));
           for (k = 0; k < 5; k++) {
               Hi[k] ^= U[k];
           }
           U_old = U;
       }
       Hi = SHA1.binb2str(Hi);

       const clientKey = SHA1.core_hmac_sha1(Hi, "Client Key");
       const serverKey = SHA1.str_hmac_sha1(Hi, "Server Key");
       const clientSignature = SHA1.core_hmac_sha1(SHA1.str_sha1(SHA1.binb2str(clientKey)), authMessage);
       connection._sasl_data["server-signature"] = SHA1.b64_hmac_sha1(serverKey, authMessage);

       for (k = 0; k < 5; k++) {
           clientKey[k] ^= clientSignature[k];
       }
       responseText += ",p=" + btoa(SHA1.binb2str(clientKey));
       return responseText;
    }

    clientChallenge (connection, test_cnonce) {  // eslint-disable-line class-methods-use-this
        const cnonce = test_cnonce || MD5.hexdigest("" + (Math.random() * 1234567890));
        let auth_str = "n=" + utils.utf16to8(connection.authcid);
        auth_str += ",r=";
        auth_str += cnonce;
        connection._sasl_data.cnonce = cnonce;
        connection._sasl_data["client-first-message-bare"] = auth_str;
        auth_str = "n,," + auth_str;
        return auth_str;
    }
}
