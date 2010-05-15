

Strophe.Test = {
    BOSH_URL: "/xmpp-httpbind",
    XMPP_DOMAIN: 'speeqe.com',
    room_name: 'speeqers@chat.speeqe.com',
    connection: null, //connection object created in run function
    
    run: function() {
	$(document).ready(function(){
	    //Connect strophe, uses localhost to test
	    Strophe.Test.connection =
                new Strophe.Connection(Strophe.Test.BOSH_URL);
	    
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
		test("join a room test",function() {
                    Strophe.Test.connection.muc.join(Strophe.Test.room_name,
                                                     "testnick",
                                                     function(msg) {
                                                         $('#muc_item').append($(msg).text());
                                                     },
                                                     function(pres) {
                                                         $('#muc_item').append($(pres).text());
                                                     });
		    ok(true,
		       "joined " + Strophe.Test.room_name);
                    
		});
		test("send a message", function() {
                    Strophe.Test.connection.muc.message(Strophe.Test.room_name,
                                                        "testnick",
                                                        "test message");
                });
                test("configure room", function() {
                    Strophe.Test
                        .connection.muc.configure(Strophe.Test.room_name);
                    Strophe.Test
                        .connection.muc.cancelConfigure(Strophe.Test.room_name);
                });
		test("leave a room test", function() {
                    var iqid = Strophe.Test
                        .connection.muc.leave(Strophe.Test.room_name,
                                              "testnick",
                                              function() {
                                                  $('#muc_item').append("left room "+
                                                                        Strophe.Test.room_name);
                                              });
		    if(iqid)
			ok(true,
			   "left room");
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
	    var bare_jid =
                Strophe.getBareJidFromJid(Strophe.Test.connection.jid)
                .split("@")[0];
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
	    $('muc_item').text(error_message);
	    
	}
    }
};
