import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { DataSourceConfig } from '../configs/database.config.js';
import {
    assertNotProdOutsideLambda,
    describeDatabaseTarget,
    resolveDatabaseTarget,
} from '../configs/database-target.js';

// 手元から本番の DB につながない（migration:run:prod の SOTETSU_PROD_MIGRATION=confirmed だけ通す）
assertNotProdOutsideLambda(process.env);

try {
    console.warn(describeDatabaseTarget(resolveDatabaseTarget(process.env)));
} catch (e) {
    console.warn(e instanceof Error ? e.message : String(e));
}

// typeorm の CLI（migration:*）用。migrations は db/migrations の .ts を swc-node で読む
export const AppDataSource = new DataSource({
    ...DataSourceConfig,
    migrations: [
        join(
            import.meta.dirname,
            '..',
            '..',
            '..',
            'db',
            'migrations',
            '**',
            '*.{ts,js}',
        ),
    ],
});
