import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities.js';
import { TypeOrmNamingStrategy } from './typeorm-naming-strategy.js';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { resolveReadOnlyExtra } from './database-target.js';

// migrations はアプリでは使わないので、CLI 用の src/core/utils/data-source.ts だけで渡す
export const DataSourceConfig: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ENTITIES,
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
        max: 1,
        // connectionTimeoutMillis: 1000,
        idleTimeoutMillis: 1000 * 60 * 5,
        // 本番 DB を Lambda の外から見るときは DB が書き込みを拒む
        ...resolveReadOnlyExtra(process.env),
    },
};

export const NestJSTypeOrmConfig: TypeOrmModuleOptions = {
    ...DataSourceConfig,
    retryAttempts: 10,
    retryDelay: 0,
};
