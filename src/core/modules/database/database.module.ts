import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestJSTypeOrmConfig } from 'src/core/configs/database.config';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            ...NestJSTypeOrmConfig,
            migrations: [],
        }),
    ],
})
export class DatabaseModule {}
