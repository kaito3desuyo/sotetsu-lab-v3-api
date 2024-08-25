import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationModel } from './infrastructure/models/operation.model';
import { OperationQuery } from './infrastructure/queries/operation.query';

@Module({
    imports: [TypeOrmModule.forFeature([OperationModel])],
    exports: [OperationQuery],
    providers: [OperationQuery],
})
export class OperationLibsModule {}
