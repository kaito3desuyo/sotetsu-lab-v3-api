import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './trip.entity';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { TripBlock } from './trip_block.entity';
import { TripBlockService } from './trip_block.service';
import { TripClassService } from './trip_class.service';
import { TripClass } from './trip_class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, TripBlock, TripClass])],
  controllers: [TripController],
  providers: [TripService, TripBlockService, TripClassService],
})
export class TripModule {}
