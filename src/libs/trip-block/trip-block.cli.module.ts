import { Module } from '@nestjs/common';
import { OperationLibsModule } from '../operation/operation.libs.module';
import {
    CopyTripBlocksCommand,
    TripBlockCommand,
} from './presentation/trip-block.cli.command';
import { TripBlockLibsModule } from './trip-block.libs.module';
import { TripBlockCliService } from './usecase/trip-block.cli.service';

@Module({
    imports: [TripBlockLibsModule, OperationLibsModule],
    providers: [TripBlockCommand, CopyTripBlocksCommand, TripBlockCliService],
})
export class TripBlockCliModule {}
