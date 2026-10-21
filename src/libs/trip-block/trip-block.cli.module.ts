import { Module } from '@nestjs/common';
import { OperationLibsModule } from '../operation/operation.libs.module.js';
import {
    CopyTripBlocksCommand,
    TripBlockCommand,
} from './presentation/trip-block.cli.command.js';
import { TripBlockLibsModule } from './trip-block.libs.module.js';
import { TripBlockCliService } from './usecase/trip-block.cli.service.js';

@Module({
    imports: [TripBlockLibsModule, OperationLibsModule],
    providers: [TripBlockCommand, CopyTripBlocksCommand, TripBlockCliService],
})
export class TripBlockCliModule {}
