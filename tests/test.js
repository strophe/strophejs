

Strophe.Test = {
    BOSH_URL: "/xmpp-httpbind",
    XMPP_DOMAIN: 'stanziq.com',
    DEFAULT_WAIT: 60,
    DEFAULT_HOLD: 1,
    DEFAULT_WINDOW: 5,
    DEFAULT_ROUTE: "xmpp:stanziq.com:5222",
    PUBSUB_COMPONENT: "pubsub.stanziq.com",
    _node_name: "", //node name created in connectCallback function
    connection: null, //connection object created in run function
    
    run: function() {
	

	$(document).ready(function(){

	    //Connect strophe, uses localhost to test
	    Strophe.Test.connection = new Strophe.Connection(Strophe.Test.BOSH_URL);

	    //connect anonymously to run most tests
            var username = Strophe.Test.XMPP_DOMAIN;
            var password = "password";
        
        

	    Strophe.Test.connection.connect(username,
			       password,
			       Strophe.Test.connectCallback,
                               Strophe.Test.DEFAULT_WAIT,
                               Strophe.Test.DEFAULT_HOLD,
                               Strophe.Test.DEFAULT_WINDOW,
                               Strophe.Test.DEFAULT_ROUTE);


	    //set up the test client UI
	    $("#disconnect").click(function() {
		Strophe.Test.connection.disconnect();
	    });
	    $("#run_tests").click(function() {      

		test("Anonymous connection test.", function() {
		    
		    if(Strophe.Test.connection.connected)
		    {
			ok( true, "all good");
		    }
		    else
		    {
			ok( false, "not connected anonymously");
		    }
		});

		test("Create default node test.",function(){
		    var ps = new Strophe.PubSub(Strophe.Test.connection);
		    var iqid  = ps.createNode(Strophe.Test.connection.jid,
					      Strophe.Test.PUBSUB_COMPONENT,
					      Strophe.Test._node_name,{}, function(stanza) {

						  
			       test("handled create node.",
				function() {
				    var error = $(stanza).find("error");
				
				    if(error.length == 0)
				    {
					ok(true, "returned");
				    }
				    else
				    {
					ok(false,"error creating node.");
				    }
				});
					      });
		    ok(true,"sent create request. "+ iqid);
		});

		var psub = new Strophe.PubSub(Strophe.Test.connection);
		//setup the itemsReceived function
		psub.itemsReceived = function(stanza) {
		    test("items received", function() {
			console.log(stanza);
			if($(stanza).length > 0)
			{
			    ok(true,"item received.");
			}
			else
			{
			    ok(false,"no items.");
			}
		    });
		};

		test("subscribe to a node",function() {


		    var iqid = psub.subscribe(Strophe.Test.connection.jid,
					    Strophe.Test.PUBSUB_COMPONENT,
					    Strophe.Test._node_name,
					      [],
			  function(stanza) {
			      
			      var error = $(stanza).find("error");

			      test("handled subscribe",
				   function() {
				  if(error.length == 0)
				      {
					  ok(true,"subscribed");
				      }
				  else
				      {
					  console.log(error.get(0));
					  ok(false,
					     "not subscribed");
				      }
				  
			      });
			  });
		    
		    if(iqid)
			ok(true,
			   "subscribed to " + Strophe.Test._node_name);

		});

		test("publish to a node",function() {
		    var ps = new Strophe.PubSub(Strophe.Test.connection);
		    var iqid = ps.publish(Strophe.Test.connection.jid,
					  Strophe.Test.PUBSUB_COMPONENT,
					  Strophe.Test._node_name,
			{test:'test'},
					  function(stanza) {
						
						var error = $(stanza).find("error");
						
						test("handled published item",
						     function() {
						    if(error.length == 0)
						    {
							ok(true,"got item");
						    }
						    else
						    {
							ok(false,
							   "no item");
						    }
						    
						});
					    });
		    
		    if(iqid)
			ok(true,
			   "published to " + Strophe.Test._node_name);

		});		
		test("subscribe to a node with options",function() {

		    var keyword_elem = Strophe.xmlElement("field",
							  [["var",
							    "http://stanziq.com/search#keyword"],
							   ["type",
							    'text-single'],
							   ["label",
							    "keyword to match"]]);
		    var value = Strophe.xmlElement("value",[]);
		    var text = Strophe.xmlTextNode("crazy");
		    value.appendChild(text);
		    keyword_elem.appendChild(value);
		    var ps = new Strophe.PubSub(Strophe.Test.connection);
		    
		    var iqid = ps.subscribe(Strophe.Test.connection.jid,
					    Strophe.Test.PUBSUB_COMPONENT,
					    Strophe.Test._node_name,
			[keyword_elem],
			function(stanza) {
			    
			    var error = $(stanza).find("error");
			    
			    test("handled subscribe with options",
				 function() {
				if(error.length == 0)
				    {
					ok(true,"search subscribed");
				    }
				else
				    {
					console.log(error.get(0));
					ok(false,
					   "search not subscribed");
				    }
				
			    });
			});
		    
		    if(iqid)
			ok(true,
			   "subscribed to search");
		});
		test("unsubscribe to a node",function() {
		    var ps = new Strophe.PubSub(Strophe.Test.connection);
		    var iqid = ps.unsubscribe(Strophe.Test.connection.jid,
					      Strophe.Test.PUBSUB_COMPONENT,
					      Strophe.Test._node_name,
		       function(stanza) {
			   
			   var error = $(stanza).find("error");
			   
			   test("handled unsubscribe",
				function() {
			       if(error.length == 0)
				   {
				       ok(true,"unsubscribed");
				   }
			       else
				   {
				       console.log(error.get(0));
				       ok(false,
					  "unable to unsubscribed");
				   }
			       
			   });
		       });
		    
		    if(iqid)
			ok(true,
			   "unsubscribed from search with no options.");
		});
		test("test sendIQ interface.",function(){
		    var sendiq_good = false;
		    //setup timeout for sendIQ for 3 seconds
		    setTimeout(function() {
			ok(sendiq_good, "The iq didn't timeout.");
		    }, 3000);

		    //send a pubsub subscribe stanza

		    var sub = $iq( 
		              {from:Strophe.Test.connection.jid, 
			      to:Strophe.Test.PUBSUB_COMPONENT, 
			      type:'set'}
		    );
		    sub.c('pubsub', { xmlns:Strophe.NS.PUBSUB }).c('subscribe',
		    {node:Strophe.Test._node_name,
			      jid:Strophe.Test.connection.jid});
		    var stanza=sub.tree();
		    //call sendIQ with several call backs
		    Strophe.Test.connection.sendIQ(stanza,
		    function(stanza) {
			test("iq sent",function() {
			    sendiq_good = true;
			    ok(true,"iq sent succesfully.");
			});
		    },
		    function(stanza) {
			test("iq fail",function() {
			    sendiq_good = false;
			    console.log(stanza);
			    ok(false,"failed to send iq.");
			});
		    });


		});
	    });
	    
	});
    },
    connectCallback: function(status,cond) {
	var error_message = null;
	if(status == Strophe.Status.CONNECTED)
	{
	    $('#run_tests').show();
	    $('#disconnect').show();
	    var bare_jid = Strophe.getBareJidFromJid(Strophe.Test.connection.jid).split("@")[0];
	    Strophe.Test._node_name = "/home/"+Strophe.Test.XMPP_DOMAIN+"/"+bare_jid;
	}
	else if (status == Strophe.Status.DISCONNECTED || status == Strophe.Status.DICONNECTING)
	{
	    $('#run_tests').hide();
	    $('#disconnect').hide();
	}	
	else if ((status == 0) || (status == Strophe.Status.CONNFAIL))
	{
	    error_message = "Failed to connect to xmpp server.";
	}
	else if (status == Strophe.Status.AUTHFAIL)
	{
	    error_message = "Failed to authenticate to xmpp server.";
	}
	if(error_message)
	{
	    $('published_item').text(error_message);
	    
	}
    }
};
