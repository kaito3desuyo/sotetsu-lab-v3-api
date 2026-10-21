import { Module } from '@nestjs/common';
import { TripLibsModule } from './trip.libs.module.js';
import { TripV3Controller } from './presentation/trip.v3.controller.js';
import { TripV3Service } from './usecase/trip.v3.service.js';

@Module({
    imports: [TripLibsModule],
    controllers: [TripV3Controller],
    providers: [TripV3Service],
})
export class TripV3Module {}
