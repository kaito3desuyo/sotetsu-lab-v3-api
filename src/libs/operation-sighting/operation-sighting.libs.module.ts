import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheCommand } from './infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingInvalidationModel } from './infrastructure/models/operation-sighting-invalidation.model';
import { OperationSightingLatestCacheModel } from './infrastructure/models/operation-sighting-latest-cache.model';
import { OperationSightingManagementLogModel } from './infrastructure/models/operation-sighting-management-log.model';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';
import { OperationSightingLatestCacheQuery } from './infrastructure/query/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';

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
