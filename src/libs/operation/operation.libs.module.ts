import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedCacheModule } from '../../core/modules/shared-cache/shared-cache.module.js';
import { TripOperationListModel } from '../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationModel } from './infrastructure/models/operation.model.js';
import { ItinerarySegmentQuery } from './infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from './infrastructure/queries/operation.query.js';
import { ItinerarySegmentReader } from './usecase/itinerary-segment.reader.js';
import { OperationCurrentPositionReader } from './usecase/operation-current-position.reader.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([OperationModel, TripOperationListModel]),
        SharedCacheModule,
    ],
    exports: [
        OperationQuery,
        ItinerarySegmentQuery,
        ItinerarySegmentReader,
        OperationCurrentPositionReader,
    ],
    providers: [
        OperationQuery,
        ItinerarySegmentQuery,
        ItinerarySegmentReader,
        OperationCurrentPositionReader,
    ],
})
export class OperationLibsModule {}
