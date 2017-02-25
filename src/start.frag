/** File: strophe.js
 *  A JavaScript library for writing XMPP clients.
 *
 *  This library uses either Bidirectional-streams Over Synchronous HTTP (BOSH)
 *  to emulate a persistent, stateful, two-way connection to an XMPP server or
 *  alternatively WebSockets.
 *
 *  More information on BOSH can be found in XEP 124.
 *  For more information on XMPP-over WebSocket see this RFC:
 *  http://tools.ietf.org/html/rfc7395
 */

/* All of the Strophe globals are defined in this special function below so
 * that references to the globals become closures.  This will ensure that
 * on page reload, these references will still be available to callbacks
 * that are still executing.
 */

/* jshint ignore:start */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        //Browser globals case.
        var wrapper = factory();
        root.Strophe        = wrapper.Strophe;
        root.$build         = wrapper.$build;
        root.$iq            = wrapper.$iq;
        root.$msg           = wrapper.$msg;
        root.$pres          = wrapper.$pres;
        root.SHA1           = wrapper.SHA1;
        root.MD5            = wrapper.MD5;
        root.b64_hmac_sha1  = wrapper.b64_hmac_sha1;
        root.b64_sha1       = wrapper.b64_sha1;
        root.str_hmac_sha1  = wrapper.str_hmac_sha1;
        root.str_sha1       = wrapper.str_sha1;
    }
}(this, function () {
    //almond, and your modules will be inlined here
/* jshint ignore:end */
