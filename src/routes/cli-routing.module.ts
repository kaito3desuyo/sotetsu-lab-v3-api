import { Module } from '@nestjs/common';
import { SharedCacheCliModule } from '../core/modules/shared-cache/shared-cache.cli.module.js';
import { OperationSightingCliModule } from '../libs/operation-sighting/operation-sighting.cli.module.js';
import { TripBlockCliModule } from '../libs/trip-block/trip-block.cli.module.js';

@Module({
    imports: [
        TripBlockCliModule,
        OperationSightingCliModule,
        SharedCacheCliModule,
    ],
})
export class CliRoutingModule {}
