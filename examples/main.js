config.baseUrl = '../';
require.config(config);
if (typeof require === 'function') {
    require(['jquery', 'strophe'], function ($, wrapper) {
        Strophe = wrapper.Strophe;

        var BOSH_SERVICE = 'http://bosh.metajack.im:5280/xmpp-httpbind';
        var connection = null;

        function log(msg) {
            $('#log').append('<div></div>').append(document.createTextNode(msg));
        }

        function rawInput(data) {
            log('RECV: ' + data);
        }

        function rawOutput(data) {
            log('SENT: ' + data);
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
                    connection.connect($('#jid').get(0).value, $('#pass').get(0).value, onConnect);
                } else {
                    button.value = 'connect';
                    connection.disconnect();
                }
            });
        });
    });
}
