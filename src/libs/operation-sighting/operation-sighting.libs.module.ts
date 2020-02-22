import { Module } from '@nestjs/common';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';
import { OperationSightingService } from './application-service/operation-sighting.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from '../../main/v1/operation/operation-sighting.entity';
import { OperationLibsModule } from '../operation/operation.libs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OperationSighting]),
        OperationLibsModule,
    ],
    exports: [OperationSightingService],
    providers: [OperationSightingService, OperationSightingQuery],
})
export class OperationSightingLibsModule {}
