import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { Operation } from './operation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Operation, OperationSighting])],
  controllers: [OperationController],
  providers: [OperationService, OperationSightingService],
})
export class OperationModule {}
