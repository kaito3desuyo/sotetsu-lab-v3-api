import { TypeOrmNamingStrategy } from './src/utils/typeorm-naming-strategy';

export = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/**/*.entity{.ts,.js}', 'src/**/*.model{.ts,.js}'],
    migrations: ['src/db/migrations/**/*.ts'],
    cli: {
        migrationsDir: 'src/db/migrations',
    },
    synchronize: false,
    logging: true,
    namingStrategy: new TypeOrmNamingStrategy(),
};
