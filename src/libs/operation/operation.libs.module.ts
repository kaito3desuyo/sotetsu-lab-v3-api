import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { OperationModel } from './infrastructure/models/operation.model';
import { ItinerarySegmentQuery } from './infrastructure/queries/itinerary-segment.query';
import { OperationQuery } from './infrastructure/queries/operation.query';

@Module({
    imports: [TypeOrmModule.forFeature([OperationModel, TripOperationListModel])],
    exports: [OperationQuery, ItinerarySegmentQuery],
    providers: [OperationQuery, ItinerarySegmentQuery],
})
export class OperationLibsModule {}
