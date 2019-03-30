require.config({
    baseUrl: '../',
    paths: {
        "strophe":          "dist/strophe.min",

        // Examples
        "basic":            "examples/basic",

        // Not really used, only to make requirejs not complain in tests
        "ws":               "node_modules/ws/browser",
        "xhr2":             "node_modules/xhr2/lib/browser",

        // Tests
        "jquery":           "node_modules/jquery/dist/jquery",
        "sinon":            "node_modules/sinon/pkg/sinon",
        "sinon-qunit":      "node_modules/sinon-qunit/lib/sinon-qunit",
        "tests":            "tests/tests"
    },
    map: {
        // xmldom doesn't correctly load under AMD / requirejs
        // map it to load 'ws' instead just to avoid the require error.
        // It doesn't matter that it's a different module, as both of them
        // are not actually used in the browser.
        '*': {
            'xmldom': 'ws'
        }
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
