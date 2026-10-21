import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripOperationListModel } from '../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationModel } from './infrastructure/models/operation.model.js';
import { ItinerarySegmentQuery } from './infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from './infrastructure/queries/operation.query.js';

@Module({
    imports: [TypeOrmModule.forFeature([OperationModel, TripOperationListModel])],
    exports: [OperationQuery, ItinerarySegmentQuery],
    providers: [OperationQuery, ItinerarySegmentQuery],
})
export class OperationLibsModule {}
