import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { Operation } from './operation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import { Calendar } from '../calendar/calendar.entity';
import { CalendarService } from '../calendar/calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([Calendar, Operation, OperationSighting])],
  controllers: [OperationController],
  providers: [CalendarService, OperationService, OperationSightingService],
})
export class OperationModule {}
