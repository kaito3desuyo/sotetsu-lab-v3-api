import { Module } from '@nestjs/common';
import { TripLibsModule } from '../trip/trip.libs.module';
import { TripBlockV2Controller } from './presentation/trip-block.v2.controller';
import { TripBlockLibsModule } from './trip-block.libs.module';
import { TripBlockV2Service } from './usecase/trip-block.v2.service';

@Module({
    imports: [TripBlockLibsModule, TripLibsModule],
    controllers: [TripBlockV2Controller],
    providers: [TripBlockV2Service],
})
export class TripBlockV2Module {}