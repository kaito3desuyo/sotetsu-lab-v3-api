import { Module } from '@nestjs/common';
import { StationLibsModule } from './station.libs.module';
import { StationV3Controller } from './presentation/station.v3.controller';
import { StationV3Service } from './usecase/station.v3.service';

@Module({
    imports: [StationLibsModule],
    controllers: [StationV3Controller],
    providers: [StationV3Service],
})
export class StationV3Module {}
