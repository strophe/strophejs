export default Strophe;
declare namespace Strophe {
    export let VERSION: string;
    export let TIMEOUT: number;
    export let SECONDARY_TIMEOUT: number;
    export { shims };
    export { SASLAnonymous };
    export { SASLPlain };
    export { SASLSHA1 };
    export { SASLSHA256 };
    export { SASLSHA384 };
    export { SASLSHA512 };
    export { SASLOAuthBearer };
    export { SASLExternal };
    export { SASLXOAuth2 };
    export { Builder };
    export { ElementType };
    export { ErrorCondition };
    export { LOG_LEVELS as LogLevel };
    export let setLogLevel: (level: import("./constants.js").LogLevel) => void;
    export { NS };
    export { SASLMechanism };
    export { Status };
    export { TimedHandler };
    /**
     * This function is used to extend the current namespaces in
     * Strophe.NS. It takes a key and a value with the key being the
     * name of the new namespace, with its actual value.
     * @example: Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     * @param {string} name - The name under which the namespace will be
     *     referenced under Strophe.NS
     * @param {string} value - The actual namespace.
     */
    export function addNamespace(name: string, value: string): void;
    export let _connectionPlugins: {
        [x: string]: Object;
    };
    /**
     * Extends the Strophe.Connection object with the given plugin.
     * @param {string} name - The name of the extension.
     * @param {Object} ptype - The plugin's prototype.
     */
    export function addConnectionPlugin(name: string, ptype: Object): void;
}
import * as shims from './shims.js';
import SASLAnonymous from './sasl-anon.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLExternal from './sasl-external.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import Builder from './builder.js';
import { ElementType } from './constants.js';
import { ErrorCondition } from './constants.js';
import { LOG_LEVELS } from './constants.js';
import { NS } from './constants.js';
import SASLMechanism from './sasl.js';
import { Status } from './constants.js';
import TimedHandler from './timed-handler.js';
//# sourceMappingURL=core.d.ts.map