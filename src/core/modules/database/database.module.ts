import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestJSTypeOrmConfig } from '../../configs/database.config.js';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            ...NestJSTypeOrmConfig,
            migrations: [],
        }),
    ],
})
export class DatabaseModule {}
