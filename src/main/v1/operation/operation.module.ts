import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { Calendar } from '../calendar/calendar.entity';
import { CalendarService } from '../calendar/calendar.service';
import { OperationSighting } from './operation-sighting.entity';
import { OperationSightingService } from './operation-sightings.service';
import { OperationController } from './operation.controller';
import { Operation } from './operation.entity';
import { OperationService } from './operation.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Calendar, Operation, OperationSighting]),
        AuthModule,
    ],
    controllers: [OperationController],
    providers: [CalendarService, OperationService, OperationSightingService],
})
export class OperationModule {}
