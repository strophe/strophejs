import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const tsConfig = {
    typescript: require('typescript'),
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: true,
    outDir: undefined,
};

export default [
    // Browser UMD build (unminified)
    {
        input: 'src/index.ts',
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
        plugins: [typescript(tsConfig), resolve({ browser: true }), commonjs(), globals()],
    },
    // Browser UMD build (minified)
    {
        input: 'src/index.ts',
        output: {
            name: 'Strophe',
            file: 'dist/strophe.min.js',
            format: 'umd',
            exports: 'named',
        },
        plugins: [typescript(tsConfig), resolve({ browser: true }), commonjs(), globals(), terser()],
    },
    // Browser ESM build
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/strophe.browser.esm.js',
            format: 'es',
            exports: 'named',
        },
        plugins: [typescript(tsConfig)],
    },
    // Node.js ESM build
    {
        input: 'src/index.ts',
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
            typescript(tsConfig),
        ],
    },
    // Node.js CJS build
    {
        input: 'src/index.ts',
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
        plugins: [typescript(tsConfig)],
    },
];
