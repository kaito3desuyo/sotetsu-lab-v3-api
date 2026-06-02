import { Module } from '@nestjs/common';
import { OperationSightingCliModule } from 'src/libs/operation-sighting/operation-sighting.cli.module';
import { TripBlockCliModule } from 'src/libs/trip-block/trip-block.cli.module';

@Module({
    imports: [TripBlockCliModule, OperationSightingCliModule],
})
export class CliRoutingModule {}
