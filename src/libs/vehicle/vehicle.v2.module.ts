import { Module } from '@nestjs/common';
import { VehicleV2Controller } from './presentation/vehicle.v2.controller';
import { VehicleV2Service } from './usecase/vehicle.v2.service';
import { VehicleLibsModule } from './vehicle.libs.module';

@Module({
    imports: [VehicleLibsModule],
    controllers: [VehicleV2Controller],
    providers: [VehicleV2Service],
})
export class VehicleV2Module {}
