
/** File: strophe.js
 *  A JavaScript library to enable XMPP over WebRTC in Strophejs.
 *
 *  This file implements XMPP over WebRTC for Strophejs.
 *  If a Connection is established with a Websocket url (p2p://...)
 *  Strophe will use WebRTC instead of BOSH.
 *  WebRTC support implemented by Jens Bavendiek (bavendiek@dbis.rwth-aachen.de)
 *  For more information on XMPP-over WebRTC see this RFC draft:
 *  TBA
 */

/** PrivateConstructor: Strophe.WebRTC
 *  Create and initialize a Strophe.WebRTC object.
 *  Currently only sets the connection Object.
 *
 *  Parameters:
 *    (Strophe.Connection) connection - The Strophe.Connection that will use WebRTC.
 *
 *  Returns:
 *    A new Strophe.WebRTC object.
 */
Strophe.WebRTC = function(connection, options) {
    this._conn = connection;
    /** PrivateFunction _bodyWrap
     *  _Private_ helper function to wrap a stanza in a <body> tag.
     *  This is used so Strophe can process stanzas from WebSockets like BOSH
     */
    this._conn._bodyWrap = function (stanza)
    {
        return $build('body', {
            xmlns: Strophe.NS.HTTPBIND
        }).cnode(stanza);
    };

    this.options = options;
};

Strophe.WebRTC.prototype = {
    /** PrivateFunction: _buildStream
     *  _Private_ helper function to generate the <stream> start tag for WebRTC
     *
     *  Returns:
     *    A Strophe.Builder with a <stream> element.
     */
    _buildStream: function ()
    {
        return $build("stream:stream", {
            "to": this._conn.jid,
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
        Strophe.error("WebRTC stream error: " + condition + " - " + text);

        // close the connection on stream_error
        this._conn._changeConnectStatus(connectstatus, condition);
        this._conn._doDisconnect();
        return true;
    },

    /** PrivateFunction: _connect
     *  _Private_ function called by Strophe.Connection.connect
     *
     *  Creates a WebRTC for a connection and assigns Callbacks to it.
     *  Does nothing if there already is a WebRTC.
     */
     //TODO
    _connect: function (connection, route) {
        if(this.options.channel === undefined) {
          Console.log("JAB: channel = undefined");
          return false;
        }
        // Ensure that there is no open WebSocket from a previous Connection.
        //this._closeSocket();
        this._onConnection(this.options.channel);
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
    _connect_cb_wrapper: function(evt) {
        console.log("Wrapper called");
        //Inject namespaces into stream tags. has to be done because no SAX parser is used.
        var string = evt.data.replace(/<stream:([a-z]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        var parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        if (elem.nodeName == "stream:stream") {
            this.channel.onmessage = this._onMessage.bind(this);
            this._conn._connect_cb(this._conn._bodyWrap(elem).tree());
            this._conn._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Strophe.serialize(elem));
            //_connect_cb will check for stream:error and disconnect on error
            this._connect_cb(elem);
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
        console.log("Disconnect");
        //TODO
        if (this.channel.peerConnection.readyState !== "closed") {
            if (pres) {
                this._conn.send(pres);
            }
            var close = '</stream:stream>';
            this._conn.xmlOutput(this._conn._bodyWrap(document.createElement("stream:stream")));
            this._conn.rawOutput(close);
            try {
                this.channel.send(close);
            } catch (e) {
                Strophe.info("Couldn't send closing stream tag.");
            }

            this._conn._doDisconnect();
        }
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  Just closes the Channel for WebRTC
     */
     //TODO
    _doDisconnect: function ()
    {
        Strophe.info("WebRTC _doDisconnect was called");
        this._closeSocket();
    },

    /** PrivateFunction: _closeSocket
     *  _Private_ function to close the DataChannel.
     *
     *  Closes the DataChannel if it is still open and deletes it
     */
     //TODO
    _closeSocket: function ()
    {
        if (this.channel) {
            this.channel.close();
        }
        delete this.channel;
    },

    /** PrivateFunction: _emptyQueue
     * _Private_ function to check if the message queue is empty.
     *
     *  Returns:
     *    True, because WebRTC messages are send immediately after queueing.
     */
    _emptyQueue: function ()
    {
        return true;
    },

    /** PrivateFunction: _onClose
     * _Private_ function to handle websockets closing.
     *
     * Nothing to do here for WebRTCs
     */
    _onClose: function(event) {
        if(this._conn.connected && !this._conn.disconnecting) {
            Strophe.error("DataChannel closed unexcectedly");
            this._conn._doDisconnect();
        } else {
            Strophe.info("Websocket closed");
        }
    },

    /** PrivateFunction: _no_auth_received
     *
     * Called on stream start/restart when no stream:features
     * has been received.
     */
    _no_auth_received: function (_callback)
    {
      this._conn.authenticated=true;
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  This does nothing for WebRTCs
     */
    _onDisconnectTimeout: function () {},

    /** PrivateFunction: _onError
     * _Private_ function to handle websockets errors.
     *
     * Parameters:
     * (Object) error - The websocket error.
     */
    _onError: function(error) {
        Strophe.error("DataChannel error " + error);
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
                    var stanza, rawStanza;
                    if (data[i] === "restart") {
                        stanza = this._buildStream();
                        rawStanza = this._removeClosingTag(stanza);
                    } else {
                        stanza = data[i];
                        rawStanza = Strophe.serialize(stanza);
                    }
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.channel.send(rawStanza);
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
    _onMessage: function(evt) {
        // check for closing stream
        if (evt.data === "</stream:stream>") {
            var close = "</stream:stream>";
            this._conn.rawInput(close);
            this._conn.xmlInput(this._conn._bodyWrap(document.createElement("stream:stream")));
            if (!this._conn.disconnecting) {
                this._conn._doDisconnect();
            }
            return;
        }
        var string = evt.data;
        if (string.search("xmlns:stream") == -1) {
            //Inject namespaces into stream tags if they are missing. Has to be done because no SAX parser is used.
            string = string.replace(/<stream:([^>]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        }
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        elem = this._conn._bodyWrap(elem).tree();

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

    /** PrivateFunction: _onConnection
     * _Private_ function to handle DataChannel connection setup.
     *
     * The opening stream tag is sent here.
     */
    _onConnection: function(connection) {
        this.channel = connection;
        Strophe.info("WebRTC datachannel open");

        this.channel.onerror = this._onError.bind(this);
        this.channel.onclose = this._onClose.bind(this);
        this.channel.onmessage = this._connect_cb_wrapper.bind(this);

        var start = this._buildStream();
        this._conn.xmlOutput(start);

        var startString = this._removeClosingTag(start);
        this._conn.rawOutput(startString);

        this.channel.send( startString);
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
     * WebRTCs don't use requests, so the passed argument is just returned.
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
     *  _Private_ part of the Connection.send function for WebRTC
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
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/
PubSubNode = function(name){
  this.name = name;
  this.subscribers = {};
  this.callback = onQuery;

  function onQuery(iq){
    console.log("onQuery", iq);
    return [];
  }
};

PubSubNode.prototype = {
  subscribe: function(connection){
    if(this.subscribers.hasOwnProperty(connection.jid)) {
      return this.subscribers[connection];
    } else{
      var subid = Math.random().toString(36).substr(2, 12);
      this.subscribers[connection.jid] = connection;
      return subid;
   }
  },
  publish: function(message){
    for(var conn in this.subscribers){
      if(this.subscribers[conn].connected) {
        this.subscribers[conn].send(message);
      }else {
        delete this.subscribers[conn];
      }
    }
      //this.subscribers[conn].send(message);
      // this.subscribers[conn]._dataRecv($msg().t(message)); TODO Notify how the relay itself gets messages,
  }
};

Strophe.PubSub = function(){
  this.nodes = {}; //Array holding the nodes from which information may be published.

};

Strophe.PubSub.prototype = {

  createNode: function(nodeName){
    console.log("Attempt to create node "+nodeName);
    if(this.nodes.hasOwnProperty(nodeName)){
      return false;
    }else {
      this.nodes[nodeName] = new PubSubNode(nodeName);
      return true;
    }
  },
  deleteNode: function(nodeName){
    delete this.nodes[nodeName];
  },
};
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/** PrivateConstructor: Strophe.Loopback
 *  Create and initialize a Strophe.Loopback object.
 *  Currently only sets the connection Object.
 *
 *  Parameters:
 *    (Strophe.Connection) connection - The Strophe.Connection that will use Loopback.
 *
 *  Returns:
 *    A new Strophe.Loopback object.
 */
Strophe.Loopback = function(connection) {
    this._conn = connection;
};

Strophe.Loopback.prototype = {
    /** PrivateFunction: _buildStream
     *  _Private_ helper function to generate the <stream> start tag for Loopback
     *
     *  Returns:
     *    A Strophe.Builder with a <stream> element.
     */
    _buildStream: function ()
    {
        return $build("stream:stream", {
            "to": this._conn.jid,
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
        Strophe.error("Loopback stream error: " + condition + " - " + text);

        // close the connection on stream_error
        this._conn._changeConnectStatus(connectstatus, condition);
        this._conn._doDisconnect();
        return true;
    },

    /** PrivateFunction: _connect
     *  _Private_ function called by Strophe.Connection.connect
     *
     *  Creates a Loopback for a connection and assigns Callbacks to it.
     *  Does nothing if there already is a Loopback.
     */
     //TODO
    _connect: function (connection, route) {
        var start = this._buildStream();
        this._conn.xmlOutput(start);

        var startString = this._removeClosingTag(start);
        this._conn.rawOutput(startString);
        this.onMessage = this._connect_cb_wrapper.bind(this);
        this.send(startString);
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
    _connect_cb_wrapper: function(data) {
        console.log("Wrapper called");
        //Inject namespaces into stream tags. has to be done because no SAX parser is used.
        var string = data.replace(/<stream:([a-z]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        var parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        if (elem.nodeName == "stream:stream") {
            this.onMessage = this._onMessage.bind(this);
            this._conn._connect_cb(this._conn._bodyWrap(elem).tree());
            this._conn._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else {
            this._conn.xmlInput(elem);
            this._conn.rawInput(Strophe.serialize(elem));
            //_connect_cb will check for stream:error and disconnect on error
            this._connect_cb(elem);
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
        console.log("Disconnect");
            var close = '</stream:stream>';
            this._conn.xmlOutput(this._conn._bodyWrap(document.createElement("stream:stream")));
            this._conn.rawOutput(close);
            try {
                this.send(close);
            } catch (e) {
                Strophe.info("Couldn't send closing stream tag.");
            }
            this._conn._doDisconnect();

    },

    /** PrivateFunction: _emptyQueue
     * _Private_ function to check if the message queue is empty.
     *
     *  Returns:
     *    True, because Loopback messages are send immediately after queueing.
     */
    _emptyQueue: function ()
    {
        return true;
    },

    /** PrivateFunction: _onClose
     * _Private_ function to handle websockets closing.
     *
     * Nothing to do here for Loopbacks
     */
    _onClose: function(event) {
        if(this._conn.connected && !this._conn.disconnecting) {
            Strophe.error("Loopback closed unexcectedly");
            this._conn._doDisconnect();
        } else {
            Strophe.info("Loopback closed");
        }
    },

    /** PrivateFunction: _no_auth_received
     *
     * Called on stream start/restart when no stream:features
     * has been received.
     */
    _no_auth_received: function (_callback)
    {
      this._conn.authenticated=true;
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  This does nothing for Loopbacks
     */
    _onDisconnectTimeout: function () {},

    /** PrivateFunction: _onError
     * _Private_ function to handle websockets errors.
     *
     * Parameters:
     * (Object) error - The websocket error.
     */
    _onError: function(error) {
        Strophe.error("Loopback error " + error);
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
                    var stanza, rawStanza;
                    if (data[i] === "restart") {
                        stanza = this._buildStream();
                        rawStanza = this._removeClosingTag(stanza);
                    } else {
                        stanza = data[i];
                        rawStanza = Strophe.serialize(stanza);
                    }
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.send(rawStanza);
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
    _onMessage: function(data) {
        // check for closing stream
        if (data === "</stream:stream>") {
            var close = "</stream:stream>";
            this._conn.rawInput(close);
            this._conn.xmlInput(this._conn._bodyWrap(document.createElement("stream:stream")));
            if (!this._conn.disconnecting) {
                this._conn._doDisconnect();
            }
            return;
        }
        var string = data;
        if (string.search("xmlns:stream") == -1) {
            //Inject namespaces into stream tags if they are missing. Has to be done because no SAX parser is used.
            string = string.replace(/<stream:([^>]*)>/, "<stream:$1 xmlns:stream='http://etherx.jabber.org/streams'>");
        }
        //Make the initial stream:stream selfclosing to parse it without a SAX parser.
        string = string.replace(/<stream:stream (.*[^/])>/, "<stream:stream $1/>");

        parser = new DOMParser();
        var elem = parser.parseFromString(string, "text/xml").documentElement;

        elem = this._conn._bodyWrap(elem).tree();

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
     * Loopbacks don't use requests, so the passed argument is just returned.
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
     *  _Private_ part of the Connection.send function for Loopback
     *
     * Just flushes the messages that are in the queue
     */
    _send: function () {
        this._conn.flush();
    },

    send:function(message){
      this.onMessage(message);
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
