import { Module } from '@nestjs/common';
import { TripClassV3Controller } from './presentation/trip-class.v3.controller.js';
import { TripClassLibsModule } from './trip-class.libs.module.js';
import { TripClassV3Service } from './usecase/trip-class.v3.service.js';

@Module({
    imports: [TripClassLibsModule],
    controllers: [TripClassV3Controller],
    providers: [TripClassV3Service],
})
export class TripClassV3Module {}
