

Strophe.Test = {
    BOSH_URL: "/xmpp-httpbind",
    XMPP_DOMAIN: 'localhost',
    PUBSUB_COMPONENT: "pubsub.localhost",
    _node_name: "", //node name created in connectCallback function
    connection: null, //connection object created in run function
    
    run: function() {
	$(document).ready(function(){
	    //Connect strophe, uses localhost to test
	    Strophe.Test.connection = new Strophe.Connection(Strophe.Test.BOSH_URL);
	    
	    //connect anonymously to run most tests
	    Strophe.Test.connection.connect(Strophe.Test.XMPP_DOMAIN,
                                            null,
			                    Strophe.Test.connectCallback);

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
		    var iqid =  Strophe.Test.connection.pubsub
                        .createNode(Strophe.Test.connection.jid,
				    Strophe.Test.PUBSUB_COMPONENT,
				    Strophe.Test._node_name, {}, 
                                    function(stanza) {
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

		test("subscribe to a node",function() {
		    var iqid = Strophe.Test.connection.pubsub
                        .subscribe(Strophe.Test.connection.jid,
				   Strophe.Test.PUBSUB_COMPONENT,
				   Strophe.Test._node_name,
				   [],
			           function(stanza) {
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
			           },
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
		    var iqid = Strophe.Test.connection.pubsub
                        .publish(Strophe.Test.connection.jid,
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
		    
		    var iqid = Strophe.Test.connection.pubsub
                        .subscribe(Strophe.Test.connection.jid,
				   Strophe.Test.PUBSUB_COMPONENT,
				   Strophe.Test._node_name,
			           [keyword_elem],
		                   function(stanza) {console.log(stanza);},
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
		    var iqid = Strophe.Test.connection.pubsub
                        .unsubscribe(Strophe.Test.connection.jid,
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

		test("test items retrieval",function(){
		    var itemid = Strophe.Test.connection.pubsub
                        .items(Strophe.Test.connection.jid,
			       Strophe.Test.PUBSUB_COMPONENT,
			       Strophe.Test._node_name,
			       function(stanza) {
				   ok(true,"item request successful.");
			       },
			       function(stanza) {
				   ok(false,"failed to send request.");
			       });
                    
		    if(itemid)
		    {
			ok(true,"item request sent.");
		    }
		});

		test("test sendIQ interface.",function(){
		    var sendiq_good = false;
		    //setup timeout for sendIQ for 3 seconds
		    setTimeout(function() {
                        test("Timeout check", function () {
			    ok(sendiq_good, "The iq didn't timeout.");
                        });
		    }, 3000);
                    
		    //send a pubsub subscribe stanza
                    
		    var sub = $iq({from:Strophe.Test.connection.jid,
			           to:Strophe.Test.PUBSUB_COMPONENT,
			           type:'set'})
		        .c('pubsub', { xmlns:Strophe.NS.PUBSUB })
                        .c('subscribe',
		           {node:Strophe.Test._node_name,
			    jid:Strophe.Test.connection.jid});
		    var stanza=sub.tree();
		    //call sendIQ with several call backs
		    Strophe.Test.connection
                        .sendIQ(stanza, 
                                function(stanza) {
			            test("iq sent",function() {
			                sendiq_good = true;
			                ok(true,"iq sent succesfully.");
			            });
		                },
		                function(stz) {
			            test("iq fail",function() {
                                        if (stz)
			                    sendiq_good = true;
			                console.log(stanza);
			                ok(true,"failed to send iq.");
			            });
		                });
		});

		test("test sendIQ failed.",function(){
		    var sub = $iq({from:Strophe.Test.connection.jid, 
			           to:Strophe.Test.PUBSUB_COMPONENT, 
			           type:'get'});

		    //call sendIQ with several call backs
		    Strophe.Test.connection
                        .sendIQ(sub.tree(),
		                function(stanza) {
			            console.log(stanza);
			            test("iq sent",function() {
			                ok(false,
			                   "iq sent succesfully when should have failed.");
			            });
		                },
		                function(stanza) {
			            test("iq fail",function() {
			                ok(true,
			                   "success on failure test: failed to send iq.");
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
