import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Station } from './station.entity';
import { StationController } from './station.controller';
import { StationService } from './station.service';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Station]), AuthModule],
    controllers: [StationController],
    providers: [StationService],
})
export class StationModule {}
