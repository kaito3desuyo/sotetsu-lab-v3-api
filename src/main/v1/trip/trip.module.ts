import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './trip.entity';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { TripBlock } from './trip_block.entity';
import { TripBlockService } from './trip_block.service';
import { TripClassService } from './trip_class.service';
import { TripClass } from './trip_class.entity';
import { TripOperationListService } from '../trip-operation-list/trip_operation_list.service';
import { TripOperationList } from '../trip-operation-list/trip_operation_list.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripBlock, TripClass, TripOperationList]),
  ],
  controllers: [TripController],
  providers: [
    TripService,
    TripBlockService,
    TripClassService,
    TripOperationListService,
  ],
})
export class TripModule {}
