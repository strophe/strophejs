/*global path, __dirname, module, process */
'use strict'
const minimist = require('minimist');
const path = require('path');
const webpack = require('webpack');

const config = {
    entry: path.resolve(__dirname, 'src/strophe.js'),
    externals: [{
        "window": "window"
    }],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'strophe.js',
        library: 'strophe',
        libraryExport: 'default',
        libraryTarget: 'umd'
    },
    devtool: 'source-map',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules|tests)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ["@babel/preset-env", {
                            "targets": {
                                "browsers": [">1%"]
                            }
                        }]
                    ]
                }
            }
        }],
    },
    resolve: {
        extensions: ['.js'],
        modules: [
            'node_modules',
            path.resolve(__dirname, "src")
        ],
        alias: {
            "es6-promise":          path.resolve(__dirname, "node_modules/es6-promise/dist/es6-promise.auto"),
            "strophe-bosh":         path.resolve(__dirname, "src/bosh"),
            "strophe-core":         path.resolve(__dirname, "src/core"),
            "strophe-md5":          path.resolve(__dirname, "src/md5"),
            "strophe-sha1":         path.resolve(__dirname, "src/sha1"),
            "strophe-utils":        path.resolve(__dirname, "src/utils"),
            "strophe-websocket":    path.resolve(__dirname, "src/websocket")
        }
    }
}

function parameterize () {
    const mode = minimist(process.argv.slice(2)).mode;
    if (mode === 'production') {
        console.log("Making a production build");
        const fn = config.output.filename;
        config.output.filename = `${fn.replace(/\.js$/, '')}.min.js`;
    }
}
parameterize();

module.exports = config;
