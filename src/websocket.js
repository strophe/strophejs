/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jslint configuration: */
/*global document, window, setTimeout, clearTimeout, console,
    XMLHttpRequest, ActiveXObject,
    Base64, MD5,
    Strophe, $build, $msg, $iq, $pres */

/** File: strophe.js
 *  A JavaScript library to enable XMPP over Websocket in Strophejs.
 *
 *  This file implements XMPP over WebSockets for Strophejs.
 *  If a Connection is established with a Websocket url (ws://...)
 *  Strophe will use WebSockets instead of BOSH.
 *  WebSocket support implemented by Andreas Guth (guth@dbis.rwth-aachen.de)
 *  For more information on XMPP-over WebSocket see this RFC draft:
 *  http://tools.ietf.org/html/draft-moffitt-xmpp-over-websocket-01
 */

/** PrivateConstructor: Strophe.Websocket
 *  Create and initialize a Strophe.WebSocket object.
 *  Currently only sets the connection Object.
 *
 *  Parameters:
 *    (Strophe.Connection) connection - The Strophe.Connection that will use WebSockets.
 *
 *  Returns:
 *    A new Strophe.WebSocket object.
 */
Strophe.Websocket = function(connection) {
    this._conn = connection;
};

Strophe.Websocket.prototype = {
    /** PrivateFunction: _buildStream
     *  _Private_ helper function to generate the <stream> start tag for WebSockets
     *
     *  Returns:
     *    A Strophe.Builder with a <stream> element.
     */
    _buildStream: function ()
    {
        return $build("stream:stream", {
            "to": this._conn.domain,
            "xmlns": Strophe.NS.CLIENT,
            "xmlns:stream": Strophe.NS.STREAM,
            "version": '1.0'
        });
    },

    /** PrivateFunction: _check_streamerror
     * _Private_ checks a message for stream:error
     *
     *  Parameters:
     *    (Strophe.Request) bodyWrap - The received stanza.
     *    connectstatus - The ConnectStatus that will be set on error.
     *  Returns:
     *     true if there was a streamerror, false otherwise.
     */
    _check_streamerror: function (bodyWrap, connectstatus) {
        var errors = bodyWrap.getElementsByTagName("stream:error");
        if (errors.length === 0) {
            return false;
        }
        var error = errors[0];
        var condition = error.childNodes[0].tagName;
        var text = error.getElementsByTagName("text")[0].textContent;
        Strophe.error("WebSocket stream error: " + condition + " - " + text);

        // close the connection on stream_error
        this._conn._changeConnectStatus(connectstatus, condition);
        this._conn._doDisconnect();
        return true;
    },

    /** PrivateFunction: _connect
     *  _Private_ function called by Strophe.Connection.connect
     *
     *  Creates a WebSocket for a connection and assigns Callbacks to it.
     *  Does nothing if there already is a WebSocket.
     */
    _connect: function () {
        // Ensure that there is no open WebSocket from a previous Connection.
        this._closeSocket();

        // Create the new WobSocket
        this.socket = new WebSocket(this._conn.service, "xmpp");
        this.socket.onopen = this._onOpen.bind(this);
        this.socket.onerror = this._onError.bind(this);
        this.socket.onclose = this._onClose.bind(this);
        this.socket.onmessage = this._connect_cb_wrapper.bind(this);
    },

    /** PrivateFunction: _connect_cb
     *  _Private_ function called by Strophe.Connection._connect_cb
     *
     * checks for stream:error
     *
     *  Parameters:
     *    (Strophe.Request) bodyWrap - The received stanza.
     */
    _connect_cb: function(bodyWrap) {
        var error = this._check_streamerror(bodyWrap, Strophe.Status.CONNFAIL);
        if (error) {
            return Strophe.Status.CONNFAIL;
        }
    },

    /** PrivateFunction: _connect_cb_wrapper
     * _Private_ function that handles the first connection messages.
     *
     * On receiving an opening stream tag this callback replaces itself with the real
     * message handler. On receiving a stream error the connection is terminated.
     */
    _connect_cb_wrapper: function(message) {
        //Inject namespaces into stream tags. has to be done because no SAX parser is used.
        var string = message.data.replace(/<stream:([a-z]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        var parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        if (elem.nodeName != "stream:stream") {
            this.socket.onmessage = this._onMessage.bind(this);
            elem = this._conn._bodyWrap(elem).tree();
            this._conn._connect_cb(elem);
        } else {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Strophe.serialize(elem));
            //_connect_cb will check for stream:error and disconnect on error
            this._connect_cb(elem)
        }
    },

    /** PrivateFunction: _disconnect
     *  _Private_ function called by Strophe.Connection.disconnect
     *
     *  Disconnects and sends a last stanza if one is given
     *
     *  Parameters:
     *    (Request) pres - This stanza will be sent before disconnecting.
     */
    _disconnect: function (pres)
    {
        if (this.socket.readyState !== WebSocket.CLOSED) {
            if (pres) {
                this._conn.send(pres);
            }
            var close = '</stream:stream>';
            this._conn.xmlOutput(this._conn._bodyWrap(document.createElement("stream:stream")));
            this._conn.rawOutput(close);
            try {
                this.socket.send(close);
            } catch (e) {
                Strophe.info("Couldn't send closing stream tag.");
            }

            this._conn._doDisconnect();
        }
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  Just closes the Socket for WebSockets
     */
    _doDisconnect: function ()
    {
        Strophe.info("WebSockets _doDisconnect was called");
        this._closeSocket();
    },

    /** PrivateFunction: _closeSocket
     *  _Private_ function to close the WebSocket.
     *
     *  Closes the socket if it is still open and deletes it
     */
    _closeSocket: function ()
    {
        if (this.socket) { try {
            this.socket.close();
        } catch (e) {} }
        this.socket = null;
    },

    /** PrivateFunction: _emptyQueue
     * _Private_ function to check if the message queue is empty.
     *
     *  Returns:
     *    True, because WebSocket messages are send immediately after queueing.
     */
    _emptyQueue: function ()
    {
        return true;
    },

    /** PrivateFunction: _onClose
     * _Private_ function to handle websockets closing.
     *
     * Nothing to do here for WebSockets
     */
    _onClose: function(event) {
        Strophe.info("Websocket closed");
    },

    /** PrivateFunction: _no_auth_received
     *
     * Called on stream start/restart when no stream:features
     * has been received.
     */
    _no_auth_received: function (_callback)
    {
        Strophe.error("Server did not send any auth methods")
        this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "Server did not send any auth methods");
        if (_callback) {
            _callback = _callback.bind(this._conn);
            _callback();
        }
        this._conn._doDisconnect();
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  This does nothing for WebSockets
     */
    _onDisconnectTimeout: function () {},

    /** PrivateFunction: _onError
     * _Private_ function to handle websockets errors.
     *
     * Parameters:
     * (Object) error - The websocket error.
     */
    _onError: function(error) {
        Strophe.error("Websocket error " + error);
    },

    /** PrivateFunction: _onIdle
     *  _Private_ function called by Strophe.Connection._onIdle
     *
     *  sends all queued stanzas 
     */
    _onIdle: function () {
        var data = this._conn._data;
        if (data.length > 0 && !this._conn.paused) {
            for (i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    if (data[i] === "restart") {
                        var stanza = this._buildStream();
                        var rawStanza = this._removeClosingTag(stanza)
                    } else {
                        var stanza = data[i];
                        var rawStanza = Strophe.serialize(stanza)
                    }
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.socket.send(rawStanza);
                }
            }
            this._conn._data = [];
        }
    },

    /** PrivateFunction: _onMessage
     * _Private_ function to handle websockets messages.
     *
     * This function parses each of the messages as if they are full documents. [TODO : We may actually want to use a SAX Push parser].
     *
     * Since all XMPP traffic starts with "<stream:stream version='1.0' xml:lang='en' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='3697395463' from='SERVER'>"
     * The first stanza will always fail to be parsed...
     * Addtionnaly, the seconds stanza will always be a <stream:features> with the stream NS defined in the previous stanza... so we need to 'force' the inclusion of the NS in this stanza!
     *
     * Parameters:
     * (string) message - The websocket message.
     */
    _onMessage: function(message) {
        // check for closing stream
        if (message.data === "</stream:stream>") {
            var close = "</stream:stream>";
            this._conn.rawInput(close);
            this._conn.xmlInput(this._conn._bodyWrap(document.createElement("stream:stream")));
            if (!this._conn.disconnecting) {
                this._conn._doDisconnect();
            }
            return;
        }
        var string = message.data;
        if (string.search("xmlns:stream") == -1) {
            //Inject namespaces into stream tags if they are missing. Has to be done because no SAX parser is used.
            string = string.replace(/<stream:([^>]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        }
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        var elem = this._conn._bodyWrap(elem).tree();

        if (this._check_streamerror(elem, Strophe.Status.ERROR)) {
            return;
        }

        //handle unavailable presence stanza before disconnecting
        if (this._conn.disconnecting &&
                elem.firstChild.nodeName === "presence" &&
                elem.firstChild.getAttribute("type") === "unavailable") {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Strophe.serialize(elem));
            // if we are already disconnecting we will ignore the unavailable stanza and
            // wait for the </stream:stream> tag before we close the connection
            return;
        } else {
            this._conn._dataRecv(elem);
        }
    },

    /** PrivateFunction: _onOpen
     * _Private_ function to handle websockets connection setup.
     *
     * The opening stream tag is sent here.
     */
    _onOpen: function() {
        Strophe.info("Websocket open");
        var start = this._buildStream();
        this._conn.xmlOutput(start);

        var startString = this._removeClosingTag(start);
        this._conn.rawOutput(startString);
        this.socket.send(startString);
    },

    /** PrivateFunction: _removeClosingTag
     *  _Private_ function to Make the first <stream:stream> non-selfclosing
     *
     *  Parameters:
     *      (Object) elem - The <stream:stream> tag.
     *
     *  Returns:
     *      The stream:stream tag as String
     */
    _removeClosingTag: function(elem) {
        var string = Strophe.serialize(elem);
        string = string.replace(/<(stream:stream .*[^/])\/>$/, "<$1>");
        return string;
    },

    /** PrivateFunction: _reqToData
     * _Private_ function to get a stanza out of a request.
     *
     * WebSockets don't use requests, so the passed argument is just returned.
     *
     *  Parameters:
     *    (Object) stanza - The stanza.
     *
     *  Returns:
     *    The stanza that was passed.
     */
    _reqToData: function (stanza)
    {
        return stanza;
    },

    /** PrivateFunction: _send
     *  _Private_ part of the Connection.send function for WebSocket
     *
     * Just flushes the messages that are in the queue
     */
    _send: function () {
        this._conn.flush();
    },

    /** PrivateFunction: _sendRestart
     *
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        clearTimeout(this._conn._idleTimeout);
        this._conn._onIdle.bind(this._conn)();
    }
};
