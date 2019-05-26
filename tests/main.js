require.config({
    baseUrl: '../',
    paths: {
        "strophe":          "dist/strophe.umd",

        // Examples
        "basic":            "examples/basic",

        // Tests
        "jquery":           "node_modules/jquery/dist/jquery",
        "sinon":            "node_modules/sinon/pkg/sinon",
        "sinon-qunit":      "node_modules/sinon-qunit/lib/sinon-qunit",
        "tests":            "tests/tests"
    },

    shim: {
        'sinon-qunit':  { deps: ['sinon']}
    }
});

require(["tests", "strophe"], function (tests, Strophe) {
    window.Strophe = Strophe;

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
