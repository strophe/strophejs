import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import pkg from './package.json';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { babelConfig } from './babel.config.json';

export default [
    // browser-friendly UMD build
    {
        input: 'src/index.js',
        output: {
            name: 'strophe',
            file: pkg.browser,
            format: 'umd',
        },
        plugins: [babel(babelConfig), resolve(), commonjs(), globals()],
    },
    // Minified UMD build
    {
        input: 'src/index.js',
        output: {
            name: 'strophe',
            file: 'dist/strophe.umd.min.js',
            format: 'umd',
        },
        plugins: [babel(babelConfig), resolve(), commonjs(), globals(), terser()],
    },
    // CommonJS (for Node) and ES module (for bundlers) build.
    {
        input: 'src/index.js',
        external: ['window', 'abab'],
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' },
        ],
        plugins: [babel(babelConfig), globals()],
    },
];
