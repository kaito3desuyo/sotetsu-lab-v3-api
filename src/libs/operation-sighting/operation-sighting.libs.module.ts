import { Module } from '@nestjs/common';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';
import { OperationSightingService } from './application-service/operation-sighting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from '../../main/v1/operation/operation-sighting.entity';
import { OperationLibsModule } from '../operation/operation.libs.module';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';

@Module({
    imports: [
        TypeOrmModule.forFeature([OperationSighting, OperationSightingModel]),
        OperationLibsModule,
    ],
    exports: [OperationSightingService, OperationSightingQuery],
    providers: [OperationSightingService, OperationSightingQuery],
})
export class OperationSightingLibsModule {}
