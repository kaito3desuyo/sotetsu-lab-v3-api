import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ENTITIES } from './entities.js';

const SRC = join(import.meta.dirname, '..', '..');

const modelFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return modelFiles(path);
        return name.endsWith('.model.ts') &&
            readFileSync(path, 'utf8').includes('@Entity(')
            ? [path]
            : [];
    });

describe('ENTITIES', () => {
    // 足したモデルを一覧に入れ忘れると、そのモデルを使う所が実行時に「No metadata」で落ちる
    it('src の @Entity のモデルを全部含む', async () => {
        const missing: string[] = [];
        for (const file of modelFiles(SRC)) {
            const mod = await import(file);
            for (const [name, value] of Object.entries(mod)) {
                if (
                    name.endsWith('Model') &&
                    !ENTITIES.includes(value as never)
                ) {
                    missing.push(`${relative(SRC, file)}: ${name}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
