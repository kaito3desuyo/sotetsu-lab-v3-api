import { Module } from '@nestjs/common';
import { StationLibsModule } from './station.libs.module.js';
import { StationV3Controller } from './presentation/station.v3.controller.js';
import { StationV3Service } from './usecase/station.v3.service.js';

@Module({
    imports: [StationLibsModule],
    controllers: [StationV3Controller],
    providers: [StationV3Service],
})
export class StationV3Module {}
