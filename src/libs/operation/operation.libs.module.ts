import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationModel } from './infrastructure/models/operation.model';
import { OperationQuery } from './infrastructure/queries/operation.query';
import { OperationRepository } from './infrastructure/repositories/operation.repository';

@Module({
    imports: [TypeOrmModule.forFeature([OperationModel])],
    exports: [OperationQuery],
    providers: [OperationRepository, OperationQuery],
})
export class OperationLibsModule {}
