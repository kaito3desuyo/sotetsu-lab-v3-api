import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../../../shared/services/auth.service';
import { OperationSightingController } from './operation-sighting.controller';
import { OperationSighting } from '../operation/operation-sighting.entity';
import { OperationSightingService } from '../operation/operation-sightings.service';
import { NewOperationSightingService } from './operation-sighting.service';
import { OperationService } from '../operation/operation.service';
import { Operation } from '../operation/operation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Operation, OperationSighting])],
  controllers: [OperationSightingController],
  providers: [
    OperationService,
    OperationSightingService,
    NewOperationSightingService,
    AuthService,
  ],
})
export class OperationSightingModule {}
