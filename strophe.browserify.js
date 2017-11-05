/** File: strophe.js
 * A JavaScript library for writing XMPP clients.
 *
 *  This library uses either Bidirectional-streams Over Synchronous HTTP (BOSH)
 *  to emulate a persistent, stateful, two-way connection to an XMPP server or
 *  alternatively WebSockets.
 *
 *  More information on BOSH can be found in XEP 124.
 *  For more information on XMPP-over WebSocket see this RFC:
 *  http://tools.ietf.org/html/rfc7395
 *
 */

/*
 *  This program is distributed under the terms of the MIT license.
 *  Please see the LICENSE file for details.
 *  Copyright 2006-2008, OGG, LLC
 */

(function () {
    "use strict";

    require('./src/polyfills');
    module.exports = require('./src/wrapper');
})();
