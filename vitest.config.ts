import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        // tsconfig has baseUrl: "./src", so src modules import each other via
        // bare specifiers (e.g. `from 'utils'`); mirror that for vitest.
        alias: {
            'utils': fileURLToPath(new URL('./src/utils.ts', import.meta.url)),
            'types': fileURLToPath(new URL('./src/types.ts', import.meta.url)),
        },
    },
    test: {
        include: ['tests/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
    },
});
