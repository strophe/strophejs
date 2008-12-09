var BOSH_SERVICE = 'http://localhost:5280/bosh';

var connection   = null;
var browser      = null;
var show_log     = true;

function log(msg) 
{
    $('#log').append('<div></div>').append(document.createTextNode(msg));
}


function rawInput(data)
{
    log('RECV: ' + data);
}

function rawOutput(data)
{
    log('SENT: ' + data);
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
	log('Strophe is connecting.');

    } else if (status == Strophe.Status.CONNFAIL) {
	log('Strophe failed to connect.');
	showConnect();
    } else if (status == Strophe.Status.DISCONNECTING) {
	log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
	log('Strophe is disconnected.');
	showConnect();

    } else if (status == Strophe.Status.CONNECTED) {
	log('Strophe is connected.');
	// Start up disco browser
	browser.showBrowser();
    }
}

function showConnect()
{
    var jid = $('#jid');
    var pass = $('#pass');
    var button = $('#connect').get(0);	

    browser.closeBrowser();

    $('label').show();
    jid.show();
    pass.show();
    $('#anon').show();
    button.value = 'connect';
    return false;
}

function showDisconnect()
{
    var jid = $('#jid');
    var pass = $('#pass');
    var button = $('#connect').get(0);	

    button.value = 'disconnect';
    pass.hide();
    jid.hide();
    $('label').hide();
    $('#anon').hide();
    return false;
}

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    browser = new Disco();

    $("#log_container").bind('click', function () {
	$("#log").toggle();	
      } 
      );

    $('#cred').bind('submit', function () {
	var button = $('#connect').get(0);
	var jid = $('#jid');
	var pass = $('#pass');	
	
	if (button.value == 'connect') {
 	    showDisconnect();
	    connection.connect(jid.get(0).value,
			       pass.get(0).value,
			       onConnect);
	} else {
	    connection.disconnect();
	    showConnect();
	}
	return false;
    });
});