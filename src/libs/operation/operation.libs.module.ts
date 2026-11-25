import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedCacheModule } from '../../core/modules/shared-cache/shared-cache.module.js';
import { TripOperationListModel } from '../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationModel } from './infrastructure/models/operation.model.js';
import { ItinerarySegmentQuery } from './infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from './infrastructure/queries/operation.query.js';
import { ItinerarySegmentReader } from './usecase/itinerary-segment.reader.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([OperationModel, TripOperationListModel]),
        SharedCacheModule,
    ],
    exports: [OperationQuery, ItinerarySegmentQuery, ItinerarySegmentReader],
    providers: [OperationQuery, ItinerarySegmentQuery, ItinerarySegmentReader],
})
export class OperationLibsModule {}
