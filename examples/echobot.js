/* global Strophe, $, $pres, $msg */

const BOSH_SERVICE = '/xmpp-httpbind';
let connection = null;

function log(msg) {
    const log = document.querySelector('#log');
    const div = document.createElement('div');
    log.appendChild(div);
    div.appendChild(document.createTextNode(msg));
}

function onConnect(status) {
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
        log('ECHOBOT: Send a message to ' + connection.jid + ' to talk to me.');

        connection.addHandler(onMessage, null, 'message', null, null, null);
        connection.send($pres().tree());
    }
}

function onMessage(msg) {
    const to = msg.getAttribute('to');
    const from = msg.getAttribute('from');
    const type = msg.getAttribute('type');
    const elems = msg.getElementsByTagName('body');

    if (type == 'chat' && elems.length > 0) {
        const body = elems[0];

        log('ECHOBOT: I got a message from ' + from + ': ' + Strophe.getText(body));

        const reply = $msg({ to: from, from: to, type: 'chat' }).cnode(Strophe.copyElement(body));
        connection.send(reply.tree());

        log('ECHOBOT: I sent ' + from + ': ' + Strophe.getText(body));
    }

    // we must return true to keep the handler alive.
    // returning false would remove it after it finishes.
    return true;
}

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);

    // Uncomment the following lines to spy on the wire traffic.
    //connection.rawInput = function (data) { log('RECV: ' + data); };
    //connection.rawOutput = function (data) { log('SEND: ' + data); };

    // Uncomment the following line to see all the debug output.
    //Strophe.log = function (level, msg) { log('LOG: ' + msg); };

    $('#connect').bind('click', function () {
        const button = $('#connect').get(0);
        if (button.value == 'connect') {
            button.value = 'disconnect';

            connection.connect($('#jid').get(0).value, $('#pass').get(0).value, onConnect);
        } else {
            button.value = 'connect';
            connection.disconnect();
        }
    });
});
