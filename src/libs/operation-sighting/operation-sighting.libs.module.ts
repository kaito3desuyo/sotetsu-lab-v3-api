import { Module } from '@nestjs/common';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';
import { OperationSightingService } from './application-service/operation-sighting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from '../../main/v1/operation/operation-sighting.entity';
import { OperationLibsModule } from '../operation/operation.libs.module';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command';

@Module({
    imports: [
        TypeOrmModule.forFeature([OperationSighting, OperationSightingModel]),
        OperationLibsModule,
    ],
    exports: [
        OperationSightingService,
        OperationSightingCommand,
        OperationSightingQuery,
    ],
    providers: [
        OperationSightingService,
        OperationSightingCommand,
        OperationSightingQuery,
    ],
})
export class OperationSightingLibsModule {}
