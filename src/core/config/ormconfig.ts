import { TypeOrmNamingStrategy } from '../../utils/typeorm-naming-strategy';
import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const ORM_CONFIG: TypeOrmModuleOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
        join(__dirname, '..', '..', '**', '*.entity.{ts,js}'),
        join(__dirname, '..', '..', '**', '*.model.{ts,js}'),
    ],
    migrations: [
        join(__dirname, '..', '..', 'db', 'migrations', '**', '*.{ts,js}'),
    ],
    cli: {
        migrationsDir: 'src/db/migrations',
    },
    synchronize: false,
    logging: true,
    namingStrategy: new TypeOrmNamingStrategy(),
};

export = ORM_CONFIG;
