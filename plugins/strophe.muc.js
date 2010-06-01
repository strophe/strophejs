/*
Plugin to implement the MUC extension. http://xmpp.org/extensions/xep-0045.html
*/
/* jslint configuration: */
/* global document, window, setTimeout, clearTimeout, console,
    XMLHttpRequest, ActiveXObject,
    Base64, MD5,
    Strophe, $build, $msg, $iq, $pres 
*/

Strophe.addConnectionPlugin('muc', {
    _connection: null,
    // The plugin must have the init function
    /***Function
    Initialize the MUC plugin. Sets the correct connection object and
    extends the namesace.
    */
    init: function(conn) {
        this._connection = conn;
        /* extend name space 
         *  NS.MUC - XMPP Multi-user chat namespace
         *              from XEP 45.  
         *
         */
        Strophe.addNamespace('MUC_OWNER', Strophe.NS.MUC+"#owner");
        Strophe.addNamespace('MUC_ADMIN', Strophe.NS.MUC+"#admin");
    },
    /***Function
    Join a multi-user chat room
    Parameters:
    (String) room - The multi-user chat room to join.
    (String) nick - The nickname to use in the chat room. Optional
    (Function) msg_handler_cb - The function call to handle messages from the
    specified chat room.
    (Function) pres_handler_cb - The function call back to handle presence
    in the chat room.
    (String) password - The optional password to use. (password protected
    rooms only)
    */
    join: function(room, nick, msg_handler_cb, pres_handler_cb, password) {
        var room_nick = this.test_append_nick(room, nick);        
        var msg = $pres({from: this._connection.jid,
                         to: room_nick})
            .c("x",{xmlns: Strophe.NS.MUC});
        if (password)
        {
            var password_elem = Strophe.xmlElement("password", 
                                                   [],
                                                   password);
            msg.cnode(password_elem);
        }
        if (msg_handler_cb)
        {
            this._connection.addHandler(function(stanza) {
                var from = stanza.getAttribute('from');
                var roomname = from.split("/");
                // filter on room name
                if (roomname.length > 1 && roomname[0] == room)
                {
                    return msg_handler_cb(stanza);
                }
                else
                {
                    return true;
                }
            },
                                        null,
                                        "message",
                                        null,
                                        null,
                                        null);
        }
        if (pres_handler_cb)
        {
            this._connection.addHandler(function(stanza) {
                var xquery = stanza.getElementsByTagName("x");
                if (xquery.length > 0)
                {
                    //Handle only MUC user protocol
                    for (var i = 0; i < xquery.length; i++)
                    {
                        var xmlns = xquery[i].getAttribute("xmlns");
                        
                        if (xmlns && xmlns.match(Strophe.NS.MUC))
                        {
                            return pres_handler_cb(stanza);
                        }
                    }
                }
                return true;                
            },
                                        null,
                                        "presence",
                                        null,
                                        null,
                                        null);
        }
        this._connection.send(msg);
    },
    /***Function
    Leave a multi-user chat room
    Parameters:
    (String) room - The multi-user chat room to leave.
    (String) nick - The nick name used in the room.
    (Function) handler_cb - Optional function to handle the successful leave.
    Returns:
    iqid - The unique id for the room leave.
    */
    leave: function(room, nick, handler_cb) {
        var room_nick = this.test_append_nick(room, nick);        
        var presenceid = this._connection.getUniqueId();
        var presence = $pres({type: "unavailable",
                              id: presenceid,
                              from: this._connection.jid,
                              to: room_nick})
            .c("x",{xmlns: Strophe.NS.MUC});
        this._connection.addHandler(handler_cb,
                                    null,
                                    "presence",
                                    null,
                                    presenceid,
                                    null);
        this._connection.send(presence);
        return presenceid;
    },
    /***Function
    Parameters:
    (String) room - The multi-user chat room name.
    (String) nick - The nick name used in the chat room.
    (String) message - The message to send to the room.
    Returns:
    msgiq - the unique id used to send the message
    */
    message: function(room, nick, message) {
        var room_nick = this.test_append_nick(room, nick);        
        var msgid = this._connection.getUniqueId();
        var msg = $msg({to: room_nick,
                        from: this._connection.jid,
                        type: "groupchat",
                        id: msgid}).c("body",
                                      {xmlns: Strophe.NS.CLIENT}).t(message);
        msg.up().c("x", {xmlns: "jabber:x:event"}).c("composing");
        this._connection.send(msg);
        return msgid;
    },
    /***Function
    Start a room configuration.
    Parameters:
    (String) room - The multi-user chat room name.
    Returns:
    id - the unique id used to send the configuration request
    */
    configure: function(room) {
        //send iq to start room configuration
        var config = $iq({to:room,
                          type: "get"}).c("query",
                                          {xmlns: Strophe.NS.MUC_OWNER});
        var stanza = config.tree();
        return this._connection.sendIQ(stanza,
                               function(){},
                               function(){});
    },
    /***Function
    Cancel the room configuration
    Parameters:
    (String) room - The multi-user chat room name.
    Returns:
    id - the unique id used to cancel the configuration.
    */
    cancelConfigure: function(room) {
        //send iq to start room configuration
        var config = $iq({to: room,
                          type: "set"})
            .c("query", {xmlns: Strophe.NS.MUC_OWNER})
            .c("x", {xmlns: "jabber:x:data", type: "cancel"});
        var stanza = config.tree();
        return this._connection.sendIQ(stanza,
                                       function(){},
                                       function(){});
    },
    /***Function
    Save a room configuration.
    Parameters:
    (String) room - The multi-user chat room name.
    (Array) configarray - an array of form elements used to configure the room.
    Returns:
    id - the unique id used to save the configuration.
    */
    saveConfiguration: function(room, configarray) {
        var config = $iq({to: room,
                          type: "set"})
            .c("query", {xmlns: Strophe.NS.MUC_OWNER})
            .c("x", {xmlns: "jabber:x:data", type: "submit"});
        for (var i = 0; i >= configarray.length; i++) {
            config.cnode(configarray[i]);
        }
        var stanza = config.tree();
        return this._connection.sendIQ(stanza,
                                       function(){},
                                       function(){});        
    },
    /***Function
    Parameters:
    (String) room - The multi-user chat room name.
    Returns:
    id - the unique id used to create the chat room.
    */
    createInstantRoom: function(room) {
        var roomiq = $iq({to: room,
                          type: "set"})
            .c("query", {xmlns: Strophe.NS.MUC_OWNER})
            .c("x", {xmlns: "jabber:x:data",
                     type: "submit"});
        return this._connection.sendIQ(roomiq.tree(),
                                       function() {},
                                       function() {});
    },
    /***
     Set the topic of the chat room.
     Parameters:
     (String) room - The multi-user chat room name.
     (String) topic - Topic message.
     */
    setTopic: function(room, topic) {
        var msg = $msg({to: room,
                        from: this._connection.jid,
                        type: "groupchat"})
            .c("subject", {xmlns: "jabber:client"}).t(topic);
        this._connection.send(msg.tree());
    },
    /***Function
    Changes the role and affiliation of a member of a MUC room.
    The modification can only be done by a room moderator. An error will be
    returned if the user doesn't have permission.
    Parameters:
    (String) room - The multi-user chat room name.
    (String) nick - The nick name of the user to modify.
    (String) role - The new role of the user.
    (String) affiliation - The new affiliation of the user.
    (String) reason - The reason for the change.
    Returns:
    iq - the id of the mode change request.
    */
    modifyUser: function(room, nick, role, affiliation, reason) {
        var item_attrs = {nick: Strophe.escapeNode(nick)};
        if (role !== null)
        {
            item_attrs.role = role;
        }
        if (affiliation !== null)
        {
            item_attrs.affiliation = affiliation;
        }
        var item = $build("item", item_attrs);
        if (reason !== null)
        {
            item.cnode(Strophe.xmlElement("reason", reason));
        }
        var roomiq = $iq({to: room,
                          type: "set"})
            .c("query", {xmlns: Strophe.NS.MUC_OWNER}).cnode(item.tree());
        return this._connection.sendIQ(roomiq.tree(),
                                       function() {},
                                       function() {});
    },
    /***Function
    Change the current users nick name.
    Parameters:
    (String) room - The multi-user chat room name.
    (String) user - The new nick name.
    */
    changeNick: function(room, user) {
        var room_nick = this.test_append_nick(room, user);
        var presence = $pres({from: this._connection.jid,
                              to: room_nick})
            .c("x",{xmlns: Strophe.NS.MUC});
        this._connection.send(presence.tree());
    },
    /***Function
    List all chat room available on a server.
    Parameters:
    (String) server - name of chat server.
    (String) handle_cb - Function to call for room list return.
    */
    listRooms: function(server, handle_cb) {
        var iq = $iq({to: server,
                      from: this._connection.jid,
                      type: "get"})
            .c("query",{xmlns: Strophe.NS.DISCO_ITEMS});        
        this._connection.sendIQ(iq, handle_cb, function(){});        
    },
    test_append_nick: function(room, nick) {
        var room_nick = room;
        if (nick) 
        {
            room_nick += "/" + Strophe.escapeNode(nick); 
        }
        return room_nick;
    }
});