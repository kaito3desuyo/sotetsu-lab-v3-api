import { Module } from '@nestjs/common';
import { TripLibsModule } from './trip.libs.module';
import { TripV3Controller } from './presentation/trip.v3.controller';
import { TripV3Service } from './usecase/trip.v3.service';

@Module({
    imports: [TripLibsModule],
    controllers: [TripV3Controller],
    providers: [TripV3Service],
})
export class TripV3Module {}
