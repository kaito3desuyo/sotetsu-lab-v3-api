import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ORM_CONFIG from 'src/core/configs/ormconfig';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            ...ORM_CONFIG,
            migrations: [],
        }),
    ],
})
export class DatabaseModule {}
