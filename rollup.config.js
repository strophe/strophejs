import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import globals from 'rollup-plugin-node-globals';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

export default [
    // browser-friendly UMD build
    {
        input: 'src/strophe.js',
        output: {
            name: 'strophe',
            file: pkg.browser,
            format: 'umd'
        },
        plugins: [
            resolve(),
            commonjs(),
            globals(),
            babel({
                babelrc: false,
                presets: [
                    ['@babel/preset-env', {
                        targets: {
                            browsers: '>1%'
                        }
                    }]
                ]
            })
        ]
    },
    // Minified UMD build
    {
        input: 'src/strophe.js',
        output: {
            name: 'strophe',
            file: 'dist/strophe.umd.min.js',
            format: 'umd'
        },
        plugins: [
            resolve(),
            commonjs(),
            globals(),
            babel({
                babelrc: false,
                presets: [
                    ['@babel/preset-env', {
                        targets: {
                            browsers: '>1%'
                        }
                    }]
                ]
            }),
            uglify()
        ]
    },
    // CommonJS (for Node) and ES module (for bundlers) build.
    {
        input: 'src/strophe.js',
        external: ['window', 'abab'],
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' }
        ],
        plugins: [
            globals(),
            babel({
                babelrc: false,
                presets: [
                    ['@babel/preset-env']
                ]
            })
        ]
    }
];
