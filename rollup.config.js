import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { babelConfig } from './babel.config.json';

export default [
    // Browser UMD build (unminified)
    {
        input: 'src/index.js',
        output: {
            name: 'Strophe',
            file: 'dist/strophe.js',
            format: 'umd',
            exports: 'named',
            globals: {
                'ws': 'WebSocket',
                'jsdom': 'JSDOM',
            },
        },
        plugins: [babel(babelConfig), resolve({ browser: true }), commonjs(), globals()],
    },
    // Browser UMD build (minified)
    {
        input: 'src/index.js',
        output: {
            name: 'Strophe',
            file: 'dist/strophe.min.js',
            format: 'umd',
            exports: 'named',
        },
        plugins: [babel(babelConfig), resolve({ browser: true }), commonjs(), globals(), terser()],
    },
    // Browser ESM build
    {
        input: 'src/index.js',
        output: {
            file: 'dist/strophe.browser.esm.js',
            format: 'es',
            exports: 'named',
        },
        plugins: [babel(babelConfig)],
    },
    // Node.js ESM build
    {
        input: 'src/index.js',
        external: ['ws', 'jsdom'],
        output: {
            file: 'dist/strophe.node.esm.js',
            format: 'es',
            exports: 'named',
        },
        plugins: [
            {
                name: 'inject-shims',
                renderChunk(code) {
                    return {
                        code:
                            `async function setupShims() {
                                    const { JSDOM } = await import('jsdom');
                                    const { default: ws } = await import('ws');
                                    const { window } = new JSDOM();
                                    globalThis.WebSocket = ws;
                                    globalThis.XMLSerializer = window.XMLSerializer;
                                    globalThis.DOMParser = window.DOMParser;
                                    globalThis.document = window.document;
                                }
                                setupShims();` + code,
                        map: { mappings: '' },
                    };
                },
            },
            babel(babelConfig),
        ],
    },
    // Node.js CJS build
    {
        input: 'src/index.js',
        external: ['ws', 'jsdom'],
        output: {
            file: 'dist/strophe.common.js',
            format: 'cjs',
            exports: 'named',
            intro: `
                const { JSDOM } = require('jsdom');
                const WebSocket = require('ws');
                const { window } = new JSDOM();
                globalThis.WebSocket = WebSocket;
                globalThis.XMLSerializer = window.XMLSerializer;
                globalThis.DOMParser = window.DOMParser;
                globalThis.document = window.document;
            `,
        },
        plugins: [babel(babelConfig)],
    },
];
