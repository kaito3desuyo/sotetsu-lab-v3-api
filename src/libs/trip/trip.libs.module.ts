import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TripModel } from './infrastructure/models/trip.model';
import { TripQuery } from './infrastructure/queries/trip.query';

@Module({
    imports: [TypeOrmModule.forFeature([TripModel]), AuthModule],
    exports: [TripQuery],
    providers: [TripQuery],
})
export class TripLibsModule {}
