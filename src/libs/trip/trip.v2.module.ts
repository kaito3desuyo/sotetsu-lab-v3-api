import { Module } from '@nestjs/common';
import { TripV2Controller } from './presentation/trip.v2.controller';
import { TripLibsModule } from './trip.libs.module';
import { TripV2Service } from './usecase/trip.v2.service';

@Module({
    imports: [TripLibsModule],
    controllers: [TripV2Controller],
    providers: [TripV2Service],
})
export class TripV2Module {}
