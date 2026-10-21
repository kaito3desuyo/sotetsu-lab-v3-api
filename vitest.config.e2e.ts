import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.e2e-spec.ts'],
        globalSetup: ['./src/test-setup.ts'],
        // TypeORM はエンティティを glob（*.model.{ts,js}）から素の Node の import() で読む。.ts を読めるようワーカーに swc-node の loader を入れる
        execArgv: ['--import', '@swc-node/register/esm-register'],
    },
    plugins: [swc.vite({ module: { type: 'es6' } })],
});
