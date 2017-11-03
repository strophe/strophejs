var config;
if (typeof(require) === 'undefined') {
    /* XXX: Hack to work around r.js's stupid parsing.
     * We want to save the configuration in a variable so that we can reuse it in
     * tests/main.js.
     */
    require = {
        config: function (c) {
            config = c;
        }
    };
}

require.config({
    baseUrl: '.',
    paths: {
        // Strophe.js src files
		"strophe-bosh":         "src/bosh",
		"strophe-core":         "src/core",
		"strophe-utils":        "src/utils",
		"strophe":              "src/wrapper",
		"strophe-md5":          "src/md5",
		"strophe-sha1":         "src/sha1",
		"strophe-websocket":    "src/websocket",
        "strophe-polyfill":     "src/polyfills",

        // Examples
        "basic":            "examples/basic",

        // Tests
		"jquery":		    "node_modules/jquery/dist/jquery",
		"sinon":		    "node_modules/sinon/lib/sinon",
		"sinon-qunit":      "node_modules/sinon-qunit/lib/sinon-qunit",
		"tests":		    "tests/tests"
    }
});

if (typeof(require) === 'function') {
    require(["strophe"], function(Strophe) {
        window.Strophe = Strophe;
    });
}
