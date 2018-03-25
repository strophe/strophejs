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
    QUnit.done(function (details) {
        console.log("Total: "+details.total+" Failed: "+details.failed+" Passed: "+details.passed+" Runtime: "+details.runtime);
        console.log("All tests completed!");
    });

    QUnit.testDone(function (details) {
        var result = {
            "Module name": details.module,
            "Test name": details.name,
            "Assertions": {
                "Total": details.total,
                "Passed": details.passed,
                "Failed": details.failed
            },
            "Skipped": details.skipped,
            "Todo": details.todo,
            "Runtime": details.runtime
        };
        console.log(JSON.stringify(result, null, 2));
    });

    QUnit.start();
    QUnit.begin(function (details) {
        tests.run();
    });
});
