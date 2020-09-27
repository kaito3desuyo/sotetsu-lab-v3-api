import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { TripOperationList } from '../trip-operation-list/trip_operation_list.entity';
import { TripOperationListService } from '../trip-operation-list/trip_operation_list.service';
import { TripController } from './trip.controller';
import { Trip } from './trip.entity';
import { TripService } from './trip.service';
import { TripBlock } from './trip_block.entity';
import { TripBlockService } from './trip_block.service';
import { TripClass } from './trip_class.entity';
import { TripClassService } from './trip_class.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Trip,
            TripBlock,
            TripClass,
            TripOperationList,
        ]),
        AuthModule,
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
