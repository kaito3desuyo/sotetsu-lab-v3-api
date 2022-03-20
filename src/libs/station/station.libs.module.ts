import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { StationModel } from './infrastructure/models/station.model';
import { StationQuery } from './infrastructure/queries/station.query';

@Module({
    imports: [TypeOrmModule.forFeature([StationModel]), AuthModule],
    exports: [StationQuery],
    providers: [StationQuery],
})
export class StationLibsModule {}
