// dist/run.sh が `node --import ./dist/register-node-path.js dist/main.js` で先に読む。
// Lambda では依存がレイヤー（NODE_PATH）にあり、ESM の import はそこを見ないため（ADR-0007）。
import { registerHooks } from 'node:module';
import { createNodePathResolve } from './core/utils/node-path-resolve.js';

const dirs = (process.env.NODE_PATH ?? '').split(':').filter(Boolean);

if (dirs.length > 0) {
    registerHooks({ resolve: createNodePathResolve(dirs) });
}
