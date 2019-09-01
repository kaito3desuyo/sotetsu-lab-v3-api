import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './trip.entity';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { TimeService } from '../time/time.service';
import { Time } from '../time/time.entity';
import { TripBlock } from './trip_block.entity';
import { TripBlockService } from './trip_block.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, TripBlock, Time])],
  controllers: [TripController],
  providers: [TripService, TripBlockService, TimeService],
})
export class TripModule {}
