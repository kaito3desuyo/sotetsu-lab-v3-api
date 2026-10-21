import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripClassModel } from './infrastructure/models/trip-class.model.js';
import { TripClassQuery } from './infrastructure/queries/trip-class.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([TripClassModel])],
    exports: [TripClassQuery],
    providers: [TripClassQuery],
})
export class TripClassLibsModule {}
