import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmNamingStrategy } from '../../utils/typeorm-naming-strategy';
// tslint:disable-next-line: no-var-requires

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [
                __dirname + '/../../**/*.entity{.ts,.js}',
                __dirname + '/../../**/*.model{.ts,.js}',
            ],
            synchronize: false,
            logging: true,
            namingStrategy: new TypeOrmNamingStrategy(),
        }),
    ],
})
export class DatabaseModule {}
