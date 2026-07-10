import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import ts from 'typescript';

const tsConfig = {
    typescript: ts,
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: true,
    outDir: undefined,
};

// The Node.js builds run in an environment without a DOM or WebSocket, so we
// shim those browser globals via jsdom and ws. Using `intro` (rather than a
// custom renderChunk) lets Rollup keep the generated source maps correct.
const nodeShimESM = `const { JSDOM } = await import('jsdom');
const { default: ws } = await import('ws');
const { window } = new JSDOM();
globalThis.WebSocket = ws;
globalThis.XMLSerializer = window.XMLSerializer;
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;`;

const nodeShimCJS = `const { JSDOM } = require('jsdom');
const WebSocket = require('ws');
const { window } = new JSDOM();
globalThis.WebSocket = WebSocket;
globalThis.XMLSerializer = window.XMLSerializer;
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;`;

// The Node builds additionally bundle Node-only transports (e.g. the XEP-0114
// component transport). Their imports — Node builtins and the `saxes` stream
// tokenizer — must stay external so they resolve at runtime rather than being
// pulled into the bundle. The browser builds never import these modules.
const nodeExternal = (id) => id === 'ws' || id === 'jsdom' || id === 'saxes' || id.startsWith('node:');

export default [
    // Browser UMD build (unminified) — CommonJS-compatible for `require()` consumers
    {
        input: 'src/index.ts',
        output: {
            name: 'Strophe',
            file: 'dist/strophe.umd.cjs',
            format: 'umd',
            exports: 'named',
            sourcemap: true,
            globals: {
                'ws': 'WebSocket',
                'jsdom': 'JSDOM',
            },
        },
        plugins: [typescript(tsConfig), resolve({ browser: true }), commonjs()],
    },
    // Browser UMD build (minified) — for direct <script>/CDN usage
    {
        input: 'src/index.ts',
        output: {
            name: 'Strophe',
            file: 'dist/strophe.umd.min.js',
            format: 'umd',
            exports: 'named',
            sourcemap: true,
        },
        plugins: [typescript(tsConfig), resolve({ browser: true }), commonjs(), terser()],
    },
    // Browser ESM build
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/strophe.esm.js',
            format: 'es',
            exports: 'named',
            sourcemap: true,
        },
        plugins: [typescript(tsConfig)],
    },
    // Node.js ESM build
    {
        input: 'src/index-node.ts',
        external: nodeExternal,
        output: {
            file: 'dist/strophe.node.esm.js',
            format: 'es',
            exports: 'named',
            sourcemap: true,
            intro: nodeShimESM,
        },
        plugins: [
            typescript(tsConfig),
            {
                name: 'emit-declaration',
                generateBundle() {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'strophe.node.esm.d.ts',
                        source: "export * from './types/index-node';\n",
                    });
                },
            },
        ],
    },
    // Node.js CJS build
    {
        input: 'src/index-node.ts',
        external: nodeExternal,
        output: {
            file: 'dist/strophe.cjs',
            format: 'cjs',
            exports: 'named',
            sourcemap: true,
            intro: nodeShimCJS,
        },
        plugins: [typescript(tsConfig)],
    },
    // Shared-connection worker: a self-contained classic (non-module) worker
    // script; point the Connection `worker` option at this file's URL.
    {
        input: 'src/shared-connection-worker.ts',
        output: {
            name: 'StropheSharedConnectionWorker',
            file: 'dist/shared-connection-worker.js',
            format: 'iife',
            exports: 'named',
            sourcemap: true,
        },
        plugins: [typescript(tsConfig)],
    },
];
