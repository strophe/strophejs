// http-pre-bind example
// This example works with mod_http_pre_bind found here:
// http://github.com/thepug/Mod-Http-Pre-Bind
// 
// It expects both /xmpp-httpbind to be proxied and /http-pre-bind
//
// If you want to test this out without setting it up, you can use Collecta's
// at http://www.collecta.com/xmpp-httpbind and 
// http://www.collecta.com/http-pre-bind
// Use a JID of 'guest.collecta.com' to test.

var BOSH_SERVICE = '/xmpp-httpbind';
var PREBIND_SERVICE = '/http-pre-bind';
var connection = null;

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
    if (status === Strophe.Status.CONNECTING) {
	log('Strophe is connecting.');
    } else if (status === Strophe.Status.CONNFAIL) {
	log('Strophe failed to connect.');
	$('#connect').get(0).value = 'connect';
    } else if (status === Strophe.Status.DISCONNECTING) {
	log('Strophe is disconnecting.');
    } else if (status === Strophe.Status.DISCONNECTED) {
	log('Strophe is disconnected.');
	$('#connect').get(0).value = 'connect';
    } else if (status === Strophe.Status.CONNECTED) {
	log('Strophe is connected.');
	connection.disconnect();
    } else if (status === Strophe.Status.ATTACHED) {
        log('Strophe is attached.');
        connection.disconnect();
    }
}

function normal_connect() {
    log('Prebind failed. Connecting normally...');

    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    connection.connect($('#jid').val(), $('#pass').val(), onConnect);
}

function attach(data) {
    log('Prebind succeeded. Attaching...');

    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;
    
    var $body = $(data.documentElement);
    connection.attach($body.find('jid').text(), 
                      $body.attr('sid'), 
                      parseInt($body.attr('rid'), 10) + 1, 
                      onConnect);
}

$(document).ready(function () {
    $('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'connect') {
	    button.value = 'disconnect';

            // attempt prebind
            $.ajax({
                type: 'POST',
                url: PREBIND_SERVICE,
                contentType: 'text/xml',
                processData: false,
                data: $build('body', {
                    to: Strophe.getDomainFromJid($('#jid').val()),
                    rid: '' + Math.floor(Math.random() * 4294967295),
                    wait: '60',
                    hold: '1'}).toString(),
                dataType: 'xml',
                error: normal_connect,
                success: attach});
	} else {
	    button.value = 'connect';
	    if (connection) {
                connection.disconnect();
            }
	}
    });
});