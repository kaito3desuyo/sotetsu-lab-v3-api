import { Module } from '@nestjs/common';
import { OperationSightingCliModule } from '../libs/operation-sighting/operation-sighting.cli.module.js';
import { TripBlockCliModule } from '../libs/trip-block/trip-block.cli.module.js';

@Module({
    imports: [TripBlockCliModule, OperationSightingCliModule],
})
export class CliRoutingModule {}
