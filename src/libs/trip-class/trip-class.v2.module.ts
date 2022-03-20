import { Module } from '@nestjs/common';
import { TripClassV2Controller } from './presentation/trip-class.v2.controller';
import { TripClassLibsModule } from './trip-class.libs.module';
import { TripClassV2Service } from './usecase/trip-class.v2.service';

@Module({
    imports: [TripClassLibsModule],
    controllers: [TripClassV2Controller],
    providers: [TripClassV2Service],
})
export class TripClassV2Module {}
