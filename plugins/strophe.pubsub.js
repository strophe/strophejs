/*
  Copyright 2008, Stanziq  Inc.
*/

Strophe.addConnectionPlugin('pubsub', {
/*
  Extend connection object to have plugin name 'pubsub'.  
*/
    _connection: null,

	//The plugin must have the init function.
	init: function(conn) {

	    this._connection = conn;

	    /*
	      Function used to setup plugin.
	    */
	    
	    /* extend name space 
	     *  NS.PUBSUB - XMPP Publish Subscribe namespace
	     *              from XEP 60.  
	     *
	     *  NS.PUBSUB_SUBSCRIBE_OPTIONS - XMPP pubsub
	     *                                options namespace from XEP 60.
	     */
	    Strophe.addNamespace('PUBSUB',"http://jabber.org/protocol/pubsub");
	    Strophe.addNamespace('PUBSUB_SUBSCRIBE_OPTIONS',
				 Strophe.NS.PUBSUB+"#subscribe_options");
	    Strophe.addNamespace('PUBSUB_ERRORS',Strophe.NS.PUBSUB+"#errors");
	    Strophe.addNamespace('PUBSUB_EVENT',Strophe.NS.PUBSUB+"#event");
	    Strophe.addNamespace('PUBSUB_OWNER',Strophe.NS.PUBSUB+"#owner");
	    Strophe.addNamespace('PUBSUB_AUTO_CREATE',
				 Strophe.NS.PUBSUB+"#auto-create");
	    Strophe.addNamespace('PUBSUB_PUBLISH_OPTIONS',
				 Strophe.NS.PUBSUB+"#publish-options");
	    Strophe.addNamespace('PUBSUB_NODE_CONFIG',
				 Strophe.NS.PUBSUB+"#node_config");
	    Strophe.addNamespace('PUBSUB_CREATE_AND_CONFIGURE',
				 Strophe.NS.PUBSUB+"#create-and-configure");
	    Strophe.addNamespace('PUBSUB_SUBSCRIBE_AUTHORIZATION',
				 Strophe.NS.PUBSUB+"#subscribe_authorization");
	    Strophe.addNamespace('PUBSUB_GET_PENDING',
				 Strophe.NS.PUBSUB+"#get-pending");
	    Strophe.addNamespace('PUBSUB_MANAGE_SUBSCRIPTIONS',
				 Strophe.NS.PUBSUB+"#manage-subscriptions");
	    Strophe.addNamespace('PUBSUB_META_DATA',
				 Strophe.NS.PUBSUB+"#meta-data");
	    
	},
	/***Function
	    
	Create a pubsub node on the given service with the given node
	name.
	
	Parameters:
	(String) jid - The node owner's jid.
	(String) service - The name of the pubsub service.
	(String) node -  The name of the pubsub node.
	(Dictionary) options -  The configuration options for the  node.
	(Function) call_back - Used to determine if node
	creation was sucessful.
	
	Returns:
	Iq id used to send subscription.
	*/
	createNode: function(jid,service,node,options, call_back) {
	    
	    var iqid = this._connection.getUniqueId("pubsubcreatenode");
	    
	    var iq = $iq({from:jid, to:service, type:'set', id:iqid});
	    
	    var c_options = Strophe.xmlElement("configure",[]);
	    var x = Strophe.xmlElement("x",[["xmlns","jabber:x:data"]]);
	    var form_field = Strophe.xmlElement("field",[["var","FORM_TYPE"],
							 ["type","hidden"]]);
	    var value = Strophe.xmlElement("value",[]);
	    var text = Strophe.xmlTextNode(Strophe.NS.PUBSUB+"#node_config");
	    value.appendChild(text);
	    form_field.appendChild(value);
	    x.appendChild(form_field);
	    
	    for (var i in options)
	    {
		var val = options[i];
		x.appendChild(val);
	    }
	    
	    if(options.length && options.length != 0)
	    {
		c_options.appendChild(x);
	    }
	    
	    iq.c('pubsub',
		{xmlns:Strophe.NS.PUBSUB}).c('create',
		    {node:node}).up().cnode(c_options);
	    
	    this._connection.addHandler(call_back,
				  null,
				  'iq',
				  null,
				  iqid,
				  null);
	    this._connection.send(iq.tree());
	    return iqid;
	},
	/***Function
	    Subscribe to a node in order to receive event items.
	    
	    Parameters:
	    (String) jid - The node owner's jid.
	    (String) service - The name of the pubsub service.
	    (String) node -  The name of the pubsub node.
	    (Array) options -  The configuration options for the  node.
	    (Function) event_cb - Used to recieve subscription events.
	    (Function) call_back - Used to determine if node
	    creation was sucessful.
	    
	    Returns:
	    Iq id used to send subscription.
	*/
	subscribe: function(jid,service,node,options, event_cb, call_back) {
	    
	    var subid = this._connection.getUniqueId("subscribenode");
	    
	    //create subscription options
	    var sub_options = Strophe.xmlElement("options",[]);
	    var x = Strophe.xmlElement("x",[["xmlns","jabber:x:data"]]);
	    var form_field = Strophe.xmlElement("field",[["var","FORM_TYPE"],
							 ["type","hidden"]]);
	    var value = Strophe.xmlElement("value",[]);
	    var text = Strophe.xmlTextNode(Strophe.NS.PUBSUB_SUBSCRIBE_OPTIONS);
	    value.appendChild(text);
	    form_field.appendChild(value);
	    x.appendChild(form_field);
	    
	    var sub = $iq({from:jid, to:service, type:'set', id:subid})

	    if(options && options.length && options.length !== 0)
	    {
	        for (var i = 0; i < options.length; i++)
	        {
		    var val = options[i];
		    x.appendChild(val);
	        }
		sub_options.appendChild(x);
		
		sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('subscribe',
		{node:node,jid:jid}).up().cnode(sub_options);
	    }
	    else
	    {
		
		sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('subscribe',
		    {node:node,jid:jid});
	    }
	    
	    
	    this._connection.addHandler(call_back,
				  null,
				  'iq',
				  null,
				  subid,
				  null);
	    
	    //add the event handler to receive items 
	    this._connection.addHandler(event_cb,
				  null,
				  'message',
				  null,
				  null,
				  null);
	    this._connection.send(sub.tree());
	    return subid;
	    
	},
	/***Function
	    Unsubscribe from a node.
	    
	    Parameters:
	    (String) jid - The node owner's jid.
	    (String) service - The name of the pubsub service.
	    (String) node -  The name of the pubsub node.
	    (Function) call_back - Used to determine if node
	    creation was sucessful.
	    
	*/    
	unsubscribe: function(jid,service,node, call_back) {
	    
	    var subid = this._connection.getUniqueId("unsubscribenode");
	    
	    
	    var sub = $iq({from:jid, to:service, type:'set', id:subid})
	    sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('unsubscribe',
		{node:node,jid:jid});

	    
	    
	    this._connection.addHandler(call_back,
				  null,
				  'iq',
				  null,
				  subid,
				  null);
	    this._connection.send(sub.tree());
	    
	    
	    return subid;
	    
	},
	/***Function
	    
	Publish and item to the given pubsub node.
	
	Parameters:
	(String) jid - The node owner's jid.
	(String) service - The name of the pubsub service.
	(String) node -  The name of the pubsub node.
	(Array) items -  The list of items to be published.
	(Function) call_back - Used to determine if node
	creation was sucessful.
	*/    
	publish: function(jid, service, node, items, call_back) {
	    var pubid = this._connection.getUniqueId("publishnode");
	    
	    
	    var publish_elem = Strophe.xmlElement("publish",
						  [["node",
						    node],
						   ["jid",
						    jid]]);
	    for (var i in items)
	    {
		var item = Strophe.xmlElement("item",[]);
		var entry = Strophe.xmlElement("entry",[]);
		var t = Strophe.xmlTextNode(items[i]);
		entry.appendChild(t);
		item.appendChild(entry);
		publish_elem.appendChild(item);
	    }
	    
	    var pub = $iq({from:jid, to:service, type:'set', id:pubid})
	    pub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).cnode(publish_elem);
	    
	    
	    this._connection.addHandler(call_back,
				  null,
				  'iq',
				  null,
				  pubid,
				  null);
	    this._connection.send(pub.tree());
	    
	    
	    return pubid;
	},
	/*Function: items
	  Used to retrieve the persistent items from the pubsub node.
	  
	*/
	items: function(jid,service,node,ok_callback,error_back) {
	    var pub = $iq({from:jid, to:service, type:'get'})
	    
	    //ask for all items
	    pub.c('pubsub', 
		{ xmlns:Strophe.NS.PUBSUB }).c('items',{node:node});
	    
	    return this._connection.sendIQ(pub.tree(),ok_callback,error_back);
	}
});
