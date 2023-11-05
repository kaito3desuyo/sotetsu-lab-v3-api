import { Module } from '@nestjs/common';
import { TripBlockCliModule } from 'src/libs/trip-block/trip-block.cli.module';

@Module({
    imports: [TripBlockCliModule],
})
export class CliRoutingModule {}
