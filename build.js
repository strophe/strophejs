({
    baseUrl: ".",
    name: "bower_components/almond/almond.js",
    out: "strophe.min.js",
    mainConfigFile: 'main.js',
    include: ['strophe'],
    wrap: {
        startFile: "src/start.frag",
        endFile: "src/end.frag"
    }
})
