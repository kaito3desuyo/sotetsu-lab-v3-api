import { Module } from '@nestjs/common';
import { TripBlockLibsModule } from './trip-block.libs.module';
import { TripBlockV3Controller } from './presentation/trip-block.v3.controller';
import { TripBlockV3Service } from './usecase/trip-block.v3.service';

@Module({
    imports: [TripBlockLibsModule],
    controllers: [TripBlockV3Controller],
    providers: [TripBlockV3Service],
})
export class TripBlockV3Module {}
