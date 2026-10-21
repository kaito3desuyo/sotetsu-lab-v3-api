import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command.js';
import { OperationSightingLatestCacheCommand } from './infrastructure/command/operation-sighting-latest-cache.command.js';
import { OperationSightingInvalidationModel } from './infrastructure/models/operation-sighting-invalidation.model.js';
import { OperationSightingLatestCacheModel } from './infrastructure/models/operation-sighting-latest-cache.model.js';
import { OperationSightingManagementLogModel } from './infrastructure/models/operation-sighting-management-log.model.js';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model.js';
import { OperationSightingLatestCacheQuery } from './infrastructure/queries/operation-sighting-latest-cache.query.js';
import { OperationSightingQuery } from './infrastructure/queries/operation-sighting.query.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OperationSightingModel,
            OperationSightingInvalidationModel,
            OperationSightingManagementLogModel,
            OperationSightingLatestCacheModel,
        ]),
    ],
    exports: [
        OperationSightingCommand,
        OperationSightingLatestCacheCommand,
        OperationSightingLatestCacheQuery,
        OperationSightingQuery,
    ],
    providers: [
        OperationSightingCommand,
        OperationSightingLatestCacheCommand,
        OperationSightingLatestCacheQuery,
        OperationSightingQuery,
    ],
})
export class OperationSightingLibsModule {}
