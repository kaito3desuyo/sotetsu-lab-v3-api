import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { VehicleController } from './vehicle.controller';
import { Vehicle } from './vehicle.entity';
import { VehicleService } from './vehicle.service';

@Module({
    imports: [TypeOrmModule.forFeature([Vehicle]), AuthModule],
    controllers: [VehicleController],
    providers: [VehicleService],
})
export class VehicleModule {}
