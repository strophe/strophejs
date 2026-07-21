/**
 * Guards the CommonJS build (`dist/strophe.cjs`). Every other suite imports the
 * ESM build, so without this file the CJS output ships untested.
 *
 * The component transport resolves its optional `saxes` peer dependency lazily,
 * via `createRequire(import.meta.url)`. For CJS output Rollup expands
 * `import.meta.url` into a snippet that sniffs `typeof document === 'undefined'`
 * to decide whether it is running in a browser, but the Node build installs a
 * global `document` (see `src/shims/node-dom.ts`). Without the `resolveImportMeta`
 * override in `rollup.config.js` that check takes the browser branch and derives a
 * bogus URL, so the transport reports `saxes` as missing even when it is installed.
 */
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);

describe('The CommonJS build', () => {
    it('loads and exposes the public API', () => {
        const { Strophe, $msg } = require('../dist/strophe.cjs');
        expect(Strophe.Connection).toBeTypeOf('function');
        expect($msg({ to: 'juliet@example.org' }).c('body').t('hi').tree().nodeName).toBe('message');
    });

    it('resolves saxes lazily, so the component transport still builds its parser', () => {
        const { Strophe, Component } = require('../dist/strophe.cjs');
        const conn = new Strophe.Connection('tcp://localhost:5347', { protocol: 'component' });
        expect(conn._proto).toBeInstanceOf(Component);
    });
});
