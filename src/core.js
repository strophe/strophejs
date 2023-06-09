/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2018, OGG, LLC
*/

import * as utils from './utils';
import Builder, { $build, $msg, $pres, $iq } from './builder.js';
import Connection from './connection.js';
import Handler from './handler.js';
import SASLAnonymous from './sasl-anon.js';
import SASLExternal from './sasl-external.js';
import SASLMechanism from './sasl.js';
import SASLOAuthBearer from './sasl-oauthbearer.js';
import SASLPlain from './sasl-plain.js';
import SASLSHA1 from './sasl-sha1.js';
import SASLSHA256 from './sasl-sha256.js';
import SASLSHA384 from './sasl-sha384.js';
import SASLSHA512 from './sasl-sha512.js';
import SASLXOAuth2 from './sasl-xoauth2.js';
import TimedHandler from './timed-handler.js';
import { ElementType, ErrorCondition, LogLevel, NS, Status, XHTML } from './constants.js';

/** Class: Strophe
 *  An object container for all Strophe library functions.
 *
 *  This class is just a container for all the objects and constants
 *  used in the library.  It is not meant to be instantiated, but to
 *  provide a namespace for library objects, constants, and functions.
 */
export const Strophe = {
    /** Constant: VERSION */
    VERSION: '1.6.1',

    Builder,
    Connection,
    ElementType,
    ErrorCondition,
    Handler,
    LogLevel,
    NS,
    SASLMechanism,
    Status,
    TimedHandler,
    ...utils,

    XHTML: {
        ...XHTML,
        validTag: utils.validTag,
        validCSS: utils.validCSS,
        validAttribute: utils.validAttribute,
    },

    /** Function: addNamespace
     *  This function is used to extend the current namespaces in
     *  Strophe.NS.  It takes a key and a value with the key being the
     *  name of the new namespace, with its actual value.
     *  For example:
     *  Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     *  Parameters:
     *    (String) name - The name under which the namespace will be
     *      referenced under Strophe.NS
     *    (String) value - The actual namespace.
     */
    addNamespace(name, value) {
        Strophe.NS[name] = value;
    },

    /** PrivateFunction: _handleError
     *  _Private_ function that properly logs an error to the console
     */
    _handleError(e) {
        if (typeof e.stack !== 'undefined') {
            Strophe.fatal(e.stack);
        }
        if (e.sourceURL) {
            Strophe.fatal(
                'error: ' + this.handler + ' ' + e.sourceURL + ':' + e.line + ' - ' + e.name + ': ' + e.message
            );
        } else if (e.fileName) {
            Strophe.fatal(
                'error: ' + this.handler + ' ' + e.fileName + ':' + e.lineNumber + ' - ' + e.name + ': ' + e.message
            );
        } else {
            Strophe.fatal('error: ' + e.message);
        }
    },

    /** Function: log
     *  User overrideable logging function.
     *
     *  This function is called whenever the Strophe library calls any
     *  of the logging functions.  The default implementation of this
     *  function logs only fatal errors.  If client code wishes to handle the logging
     *  messages, it should override this with
     *  > Strophe.log = function (level, msg) {
     *  >   (user code here)
     *  > };
     *
     *  Please note that data sent and received over the wire is logged
     *  via Strophe.Connection.rawInput() and Strophe.Connection.rawOutput().
     *
     *  The different levels and their meanings are
     *
     *    DEBUG - Messages useful for debugging purposes.
     *    INFO - Informational messages.  This is mostly information like
     *      'disconnect was called' or 'SASL auth succeeded'.
     *    WARN - Warnings about potential problems.  This is mostly used
     *      to report transient connection errors like request timeouts.
     *    ERROR - Some error occurred.
     *    FATAL - A non-recoverable fatal error occurred.
     *
     *  Parameters:
     *    (Integer) level - The log level of the log message.  This will
     *      be one of the values in Strophe.LogLevel.
     *    (String) msg - The log message.
     */
    log(level, msg) {
        if (level === this.LogLevel.FATAL) {
            console?.error(msg);
        }
    },

    /** Function: debug
     *  Log a message at the Strophe.LogLevel.DEBUG level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    debug(msg) {
        this.log(this.LogLevel.DEBUG, msg);
    },

    /** Function: info
     *  Log a message at the Strophe.LogLevel.INFO level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    info(msg) {
        this.log(this.LogLevel.INFO, msg);
    },

    /** Function: warn
     *  Log a message at the Strophe.LogLevel.WARN level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    warn(msg) {
        this.log(this.LogLevel.WARN, msg);
    },

    /** Function: error
     *  Log a message at the Strophe.LogLevel.ERROR level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    error(msg) {
        this.log(this.LogLevel.ERROR, msg);
    },

    /** Function: fatal
     *  Log a message at the Strophe.LogLevel.FATAL level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    fatal(msg) {
        this.log(this.LogLevel.FATAL, msg);
    },

    /** PrivateVariable: _requestId
     *  _Private_ variable that keeps track of the request ids for
     *  connections.
     */
    _requestId: 0,

    /** PrivateVariable: Strophe.connectionPlugins
     *  _Private_ variable Used to store plugin names that need
     *  initialization on Strophe.Connection construction.
     */
    _connectionPlugins: {},

    /** Function: addConnectionPlugin
     *  Extends the Strophe.Connection object with the given plugin.
     *
     *  Parameters:
     *    (String) name - The name of the extension.
     *    (Object) ptype - The plugin's prototype.
     */
    addConnectionPlugin(name, ptype) {
        Strophe._connectionPlugins[name] = ptype;
    },
};

/** Constants: SASL mechanisms
 *  Available authentication mechanisms
 *
 *  Strophe.SASLAnonymous   - SASL ANONYMOUS authentication.
 *  Strophe.SASLPlain       - SASL PLAIN authentication.
 *  Strophe.SASLSHA1        - SASL SCRAM-SHA-1 authentication
 *  Strophe.SASLSHA256      - SASL SCRAM-SHA-256 authentication
 *  Strophe.SASLSHA384      - SASL SCRAM-SHA-384 authentication
 *  Strophe.SASLSHA512      - SASL SCRAM-SHA-512 authentication
 *  Strophe.SASLOAuthBearer - SASL OAuth Bearer authentication
 *  Strophe.SASLExternal    - SASL EXTERNAL authentication
 *  Strophe.SASLXOAuth2     - SASL X-OAuth2 authentication
 */
Strophe.SASLAnonymous = SASLAnonymous;
Strophe.SASLPlain = SASLPlain;
Strophe.SASLSHA1 = SASLSHA1;
Strophe.SASLSHA256 = SASLSHA256;
Strophe.SASLSHA384 = SASLSHA384;
Strophe.SASLSHA512 = SASLSHA512;
Strophe.SASLOAuthBearer = SASLOAuthBearer;
Strophe.SASLExternal = SASLExternal;
Strophe.SASLXOAuth2 = SASLXOAuth2;

export { $build, $iq, $msg, $pres } from './builder.js';

export default {
    'Strophe': Strophe,
    '$build': $build,
    '$iq': $iq,
    '$msg': $msg,
    '$pres': $pres,
};
