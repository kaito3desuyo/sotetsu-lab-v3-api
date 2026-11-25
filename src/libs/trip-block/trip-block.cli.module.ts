import { Module } from '@nestjs/common';
import { CdnInvalidationModule } from '../../core/modules/cdn-invalidation/cdn-invalidation.module.js';
import { SharedCacheModule } from '../../core/modules/shared-cache/shared-cache.module.js';
import { OperationLibsModule } from '../operation/operation.libs.module.js';
import {
    CopyTripBlocksCommand,
    TripBlockCommand,
} from './presentation/trip-block.cli.command.js';
import { TripBlockLibsModule } from './trip-block.libs.module.js';
import { TripBlockCliService } from './usecase/trip-block.cli.service.js';

@Module({
    imports: [
        TripBlockLibsModule,
        OperationLibsModule,
        CdnInvalidationModule,
        SharedCacheModule,
    ],
    providers: [TripBlockCommand, CopyTripBlocksCommand, TripBlockCliService],
})
export class TripBlockCliModule {}
