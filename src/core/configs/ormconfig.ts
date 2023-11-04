import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { TypeOrmNamingStrategy } from './typeorm-naming-strategy';

const ORM_CONFIG: TypeOrmModuleOptions = {
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
    cli: {
        migrationsDir: 'db/migrations',
    },
    synchronize: false,
    logging: process.env.NODE_ENV === 'production' ? ['error'] : true,
    namingStrategy: new TypeOrmNamingStrategy(),
};

export = ORM_CONFIG;
