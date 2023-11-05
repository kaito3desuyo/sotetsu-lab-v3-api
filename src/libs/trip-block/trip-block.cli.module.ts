import { Module } from '@nestjs/common';
import {
    CopyTripBlocksCommand,
    TripBlockCommand,
} from './presentation/trip-block.cli.command';
import { TripBlockLibsModule } from './trip-block.libs.module';

@Module({
    imports: [TripBlockLibsModule],
    providers: [TripBlockCommand, CopyTripBlocksCommand],
})
export class TripBlockCliModule {}
