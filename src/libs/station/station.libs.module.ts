import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { StationModel } from './infrastructure/models/station.model.js';
import { StationQuery } from './infrastructure/queries/station.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([StationModel]), AuthModule],
    exports: [StationQuery],
    providers: [StationQuery],
})
export class StationLibsModule {}
