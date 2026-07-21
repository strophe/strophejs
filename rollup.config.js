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

// The Node.js builds run in an environment without a DOM or WebSocket. Those
// browser globals are installed by `src/shims/node-dom.ts` (the first import in
// the Node entry point), which pulls in `@xmldom/xmldom` and `ws`. Those
// packages, the Node builtins and the `saxes` stream tokenizer must stay
// external so they resolve at runtime rather than being pulled into the bundle.
// The browser builds never import any of these modules.
const nodeExternal = (id) =>
    id === 'ws' || id === '@xmldom/xmldom' || id === 'saxes' || id.startsWith('node:');

// `component-parser.ts` resolves the optional `saxes` peer dependency lazily via
// `createRequire(import.meta.url)`. For CommonJS output Rollup expands
// `import.meta.url` to a snippet that first tests `typeof document === 'undefined'`
// to decide whether it is in a browser, but the Node build installs a global
// `document` (see `src/shims/node-dom.ts`), so that test picks the browser branch
// and derives a bogus URL. These builds are Node-only, so resolve it from
// `__filename` unconditionally instead.
const nodeImportMetaUrl = {
    name: 'node-import-meta-url',
    resolveImportMeta(property, { format }) {
        if (property === 'url' && format === 'cjs') {
            return `require('url').pathToFileURL(__filename).href`;
        }
        return null;
    },
};

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
        },
        plugins: [typescript(tsConfig), nodeImportMetaUrl],
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
