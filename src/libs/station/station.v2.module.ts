import { Module } from '@nestjs/common';
import { StationV2Controller } from './presentation/station.v2.controller';
import { StationLibsModule } from './station.libs.module';
import { StationV2Service } from './usecase/station.v2.service';

@Module({
    imports: [StationLibsModule],
    controllers: [StationV2Controller],
    providers: [StationV2Service],
})
export class StationV2Module {}
