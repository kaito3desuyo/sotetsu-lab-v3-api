import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { Operation } from './operation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import { Calender } from '../calender/calender.entity';
import { CalenderService } from '../calender/calender.service';

@Module({
  imports: [TypeOrmModule.forFeature([Calender, Operation, OperationSighting])],
  controllers: [OperationController],
  providers: [CalenderService, OperationService, OperationSightingService],
})
export class OperationModule {}
