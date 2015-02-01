config.baseUrl = '../';
config.paths.jquery         = "bower_components/jquery/dist/jquery";
config.paths.sinon          = "bower_components/sinon/index";
config.paths["sinon-qunit"] = "bower_components/sinon-qunit/lib/sinon-qunit";
config.paths.tests          = "tests/tests";
config.shim = {
    'sinon-qunit':    { deps: ['sinon']}
};
require.config(config);
require(["tests"], function(tests) {
    tests.run();
    QUnit.start();
});
