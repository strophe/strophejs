config.baseUrl = '../';
config.paths.jquery         = "node_modules/jquery/dist/jquery";
config.paths.sinon          = "node_modules/sinon/pkg/sinon";
config.paths["sinon-qunit"] = "node_modules/sinon-qunit/lib/sinon-qunit";
config.paths.tests          = "tests/tests";
config.shim = {
    'sinon-qunit':  { deps: ['sinon']}
};
require.config(config);
require(["tests", "strophe-polyfill"], function(tests) {
    QUnit.start();
    tests.run();
});
