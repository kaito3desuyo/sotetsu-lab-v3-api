import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities.js';
import { TypeOrmNamingStrategy } from './typeorm-naming-strategy.js';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { assertNotProdOutsideLambda } from './database-target.js';

// 接続設定の根元の守り。AppModule を直接組む経路（e2e など）でも、接続を開く前に本番向きを止める
assertNotProdOutsideLambda(process.env);

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
    },
};

export const NestJSTypeOrmConfig: TypeOrmModuleOptions = {
    ...DataSourceConfig,
    retryAttempts: 10,
    retryDelay: 0,
};
