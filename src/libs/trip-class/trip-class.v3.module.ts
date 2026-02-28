import { Module } from '@nestjs/common';
import { TripClassV3Controller } from './presentation/trip-class.v3.controller';
import { TripClassLibsModule } from './trip-class.libs.module';
import { TripClassV3Service } from './usecase/trip-class.v3.service';

@Module({
    imports: [TripClassLibsModule],
    controllers: [TripClassV3Controller],
    providers: [TripClassV3Service],
})
export class TripClassV3Module {}
