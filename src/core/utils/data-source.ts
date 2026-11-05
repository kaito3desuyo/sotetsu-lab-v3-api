import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { DataSourceConfig } from '../configs/database.config.js';
import {
    describeDatabaseTarget,
    resolveDatabaseTarget,
} from '../configs/database-target.js';

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
