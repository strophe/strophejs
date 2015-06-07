config.baseUrl = '../';
require.config(config);
if (typeof(require) === 'function') {
    require(["jquery", "strophe", ], function($, wrapper) {
        Strophe = wrapper.Strophe;

        var button = document.getElementById("connect");
        button.addEventListener('click', function () {
            if (button.value == 'connect') {
                button.value = 'disconnect';
                connection.connect(
                    $('#jid').get(0).value,
                    $('#pass').get(0).value,
                    onConnect
                );
            } else {
                button.value = 'connect';
                connection.disconnect();
            }
        });
        $(button).hide();

        var BOSH_SERVICE = 'https://conversejs.org/http-bind/';
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
            } else if (status == Strophe.Status.ATTACHED) {
                log('Strophe is attached.');
                var button = $('#connect').get(0);
                button.value = 'disconnect';
                $(button).show();
            }
        }

        $(document).ready(function () {
            connection = new Strophe.Connection(BOSH_SERVICE, {'keepalive': true});
            connection.rawInput = rawInput;
            connection.rawOutput = rawOutput;
            try {
                connection.restore(null, onConnect);
            } catch(e) {
                if (e.name !== "StropheSessionError") { throw(e); }
                $(button).show();
            }
        });
    });
}
