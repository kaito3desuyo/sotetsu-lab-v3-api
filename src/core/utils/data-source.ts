import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { DataSourceConfig } from '../configs/database.config.js';

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
