import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';

@Module({
    imports: [TypeOrmModule.forFeature([OperationSightingModel])],
    exports: [OperationSightingCommand, OperationSightingQuery],
    providers: [OperationSightingCommand, OperationSightingQuery],
})
export class OperationSightingLibsModule {}
