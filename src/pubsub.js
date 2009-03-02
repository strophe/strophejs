/*
  Copyright 2008, Stanziq  Inc.
*/

/***Constructor
  Create and intialize a new Strophe PubSub client.

  Parameters:
  (Strophe.Connection) connection - The connection object.

  Returns:
  A new Strophe.PubSub object.
 */
Strophe.PubSub = function(connection,call_back) {
    this.connection = connection;
    //stub for function that needs to be overidden. Used to handle
    //incoming subscription and pubsub events.
    this.itemsReceived = call_back;
    //add the event handler to receive items 
    this.connection.addHandler(this.itemsReceived,
			       null,
			       'message',
			       null,
			       Strophe.NS.PUBSUB+"#event",
			       null);
    /* extend name space 
     *  NS.PUBSUB - XMPP Publish Subscribe namespace
     *              from XEP 60.  
     *
     *  NS.PUBSUB_SUBSCRIBE_OPTIONS - XMPP pubsub
     *                                options namespace from XEP 60.
     */
    Strophe.NS['PUBSUB'] = "http://jabber.org/protocol/pubsub";
    Strophe.NS['PUBSUB_SUBSCRIBE_OPTIONS'] = "http://jabber.org/protocol/pubsub#subscribe_options";

};

Strophe.PubSub.prototype = {

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
	var iqid = this.connection.getUniqueId("pubsubcreatenode");

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

	this.connection.send(iq.tree());
	this.connection.addHandler(call_back,
				   null,
				   'iq',
				   null,
				   iqid,
				   null);
	return iqid;
    },
    /***Function
	Subscribe to a node in order to receive event items.

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
    subscribe: function(jid,service,node,options, call_back) {

	var subid = this.connection.getUniqueId("subscribenode");

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

	for (var i in options)
	{
	    var val = options[i];
	    x.appendChild(val);
	}
	var sub = $iq({from:jid, to:service, type:'set', id:subid})
	if(options && options.length != 0)
	{
	    sub_options.appendChild(x);
	    
	    sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('subscribe',
	    {node:node,jid:jid}).up().cnode(sub_options);
	}
	else
	{
	    
	    sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('subscribe',
		{node:node,jid:jid});
	}

	this.connection.send(sub.tree());

	this.connection.addHandler(call_back,
				  null,
				  'iq',
				  null,
				  subid,
				  null);
	
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

	var subid = this.connection.getUniqueId("unsubscribenode");

	
	var sub = $iq({from:jid, to:service, type:'set', id:subid})
	sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('unsubscribe',
	    {node:node,jid:jid});



	this.connection.send(sub.tree());

	this.connection.addHandler(call_back,
				   null,
				   'iq',
				   null,
				   subid,
				   null);
	
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
	var pubid = this.connection.getUniqueId("publishnode");


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


	this.connection.send(pub.tree());

	this.connection.addHandler(call_back,
				   null,
				   'iq',
				   null,
				   pubid,
				   null);
	
	return pubid;
    }
};
