import { Module } from '@nestjs/common';
import { OperationService } from './usecase/operation.service';
import { OperationQuery } from './infrastructure/queries/operation.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operation } from '../../main/v1/operation/operation.entity';
import { OperationModel } from './infrastructure/models/operation.model';

@Module({
    imports: [TypeOrmModule.forFeature([Operation, OperationModel])],
    exports: [OperationService, OperationQuery],
    providers: [OperationService, OperationQuery],
})
export class OperationLibsModule {}
