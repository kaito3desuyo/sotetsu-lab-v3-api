import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TripCommand } from './infrastructure/commands/trip.command';
import { TripModel } from './infrastructure/models/trip.model';
import { TripQuery } from './infrastructure/queries/trip.query';

@Module({
    imports: [TypeOrmModule.forFeature([TripModel]), AuthModule],
    exports: [TripCommand, TripQuery],
    providers: [TripCommand, TripQuery],
})
export class TripLibsModule {}
