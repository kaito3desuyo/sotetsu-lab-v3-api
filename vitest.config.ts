import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.spec.ts'],
        globalSetup: ['./src/test-setup.ts'],
        coverage: { reportsDirectory: './coverage' },
    },
    resolve: {
        alias: { src: resolve(__dirname, 'src') },
    },
    plugins: [swc.vite({ module: { type: 'es6' } })],
});
