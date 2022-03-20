import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { VehicleModel } from './infrastructure/models/vehicle.model';
import { VehicleQuery } from './infrastructure/queries/vehicle.query';

@Module({
    imports: [TypeOrmModule.forFeature([VehicleModel]), AuthModule],
    exports: [VehicleQuery],
    providers: [VehicleQuery],
})
export class VehicleLibsModule {}
