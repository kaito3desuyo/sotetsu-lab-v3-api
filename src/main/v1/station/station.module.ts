import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Station } from './station.entity';
import { StationController } from './station.controller';
import { StationService } from './station.service';
import { AuthService } from './../../../shared/services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Station])],
  controllers: [StationController],
  providers: [StationService, AuthService],
})
export class StationModule {}
