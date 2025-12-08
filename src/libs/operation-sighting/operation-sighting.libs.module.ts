import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command';
import { OperationSightingInvalidationModel } from './infrastructure/models/operation-sighting-invalidation.model';
import { OperationSightingManagementLogModel } from './infrastructure/models/operation-sighting-management-log.model';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OperationSightingModel,
            OperationSightingInvalidationModel,
            OperationSightingManagementLogModel,
        ]),
    ],
    exports: [OperationSightingCommand, OperationSightingQuery],
    providers: [OperationSightingCommand, OperationSightingQuery],
})
export class OperationSightingLibsModule {}
