require.config({
    baseUrl: "../",
    paths: {
		"jquery":		"bower_components/jquery/dist/jquery",
		"sinon":		"bower_components/sinon/index",
		"sinon-qunit":	"bower_components/sinon-qunit/lib/sinon-qunit",
		"strophe":		"strophe",
		"tests":		"tests/tests"
    },
    shim: {
        'sinon-qunit':          { deps: ['sinon']},
        'strophe':              { exports: 'Strophe' },
    }
});

require(["tests"], function(tests) {
    tests.run();
    QUnit.start();
});
