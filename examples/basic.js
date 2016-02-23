var BOSH_SERVICE = 'http://bosh.metajack.im:5280/xmpp-httpbind';
var connection = null;

function log(msg, data) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.setAttribute( "style", "text-align: left; vertical-align: top;" );
    var td;

    th.appendChild( document.createTextNode(msg) );
    tr.appendChild( th );

    if (data) {
        td = document.createElement('td');
        pre = document.createElement('code');
        pre.setAttribute("style", "white-space: pre-wrap;");
        td.appendChild(pre);
        pre.appendChild( document.createTextNode( vkbeautify.xml(data) ) );
        tr.appendChild(td);
    } else {
        th.setAttribute('colspan', '2');
    }

    $('#log').append(tr);
}

function rawInput(data)
{
    log('RECV', data);
}

function rawOutput(data)
{
    log('SENT', data);
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
	log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
	log('Strophe failed to connect.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
	log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
	log('Strophe is disconnected.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
	log('Strophe is connected.');
	connection.disconnect();
    }
}

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    $('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'connect') {
	    button.value = 'disconnect';

	    connection.connect($('#jid').get(0).value,
			       $('#pass').get(0).value,
			       onConnect);
	} else {
	    button.value = 'connect';
	    connection.disconnect();
	}
    });
});
