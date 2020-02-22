import { Module } from '@nestjs/common';
import { OperationService } from './application-service/operation.service';
import { OperationQuery } from './infrastructure/query/operation.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operation } from '../../main/v1/operation/operation.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Operation])],
    exports: [OperationService],
    providers: [OperationService, OperationQuery],
})
export class OperationLibsModule {}
