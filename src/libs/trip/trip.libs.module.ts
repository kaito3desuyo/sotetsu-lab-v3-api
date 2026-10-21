import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/modules/auth/auth.module.js';
import { TripModel } from './infrastructure/models/trip.model.js';
import { TripQuery } from './infrastructure/queries/trip.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([TripModel]), AuthModule],
    exports: [TripQuery],
    providers: [TripQuery],
})
export class TripLibsModule {}
