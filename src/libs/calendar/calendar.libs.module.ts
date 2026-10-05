import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarDateCommand } from './infrastructure/command/calendar-date.command';
import { CalendarDateModel } from './infrastructure/models/calendar-date.model';
import { CalendarModel } from './infrastructure/models/calendar.model';
import { CalendarDateQuery } from './infrastructure/queries/calendar-date.query';
import { CalendarQuery } from './infrastructure/queries/calendar.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([CalendarModel, CalendarDateModel]),
    ],
    exports: [CalendarQuery, CalendarDateQuery, CalendarDateCommand],
    providers: [CalendarQuery, CalendarDateQuery, CalendarDateCommand],
})
export class CalendarLibsModule {}
