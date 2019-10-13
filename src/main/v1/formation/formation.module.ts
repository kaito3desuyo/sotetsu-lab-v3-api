import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './formation.entity';
import { FormationController } from './formation.controller';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { FormationService } from './formation.service';
import { AuthService } from './../../../shared/services/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Formation, OperationSighting])],
  controllers: [FormationController],
  providers: [FormationService, OperationSightingService, AuthService],
})
export class FormationModule {}
