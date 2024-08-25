import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { TypeOrmNamingStrategy } from './typeorm-naming-strategy';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const DataSourceConfig: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [join(__dirname, '..', '..', '**', '*.model.{ts,js}')],
    migrations: [
        join(
            __dirname,
            '..',
            '..',
            '..',
            'db',
            'migrations',
            '**',
            '*.{ts,js}',
        ),
    ],
    // cli: {
    //     migrationsDir: 'db/migrations',
    // },
    synchronize: false,
    logging: process.env.NODE_ENV === 'production' ? ['error'] : true,
    namingStrategy: new TypeOrmNamingStrategy(),
    // retryAttempts: 10,
    // retryDelay: 0,
    installExtensions: false,
    // keepConnectionAlive: true,
    extra: {
        // max: 1,
        // connectionTimeoutMillis: 1000,
    },
};

export const NestJSTypeOrmConfig: TypeOrmModuleOptions = {
    ...DataSourceConfig,
    retryAttempts: 10,
    retryDelay: 0,
};
