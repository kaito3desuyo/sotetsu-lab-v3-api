import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarDateCommand } from './infrastructure/command/calendar-date.command.js';
import { CalendarDateModel } from './infrastructure/models/calendar-date.model.js';
import { CalendarModel } from './infrastructure/models/calendar.model.js';
import { CalendarDateQuery } from './infrastructure/queries/calendar-date.query.js';
import { CalendarQuery } from './infrastructure/queries/calendar.query.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([CalendarModel, CalendarDateModel]),
    ],
    exports: [CalendarQuery, CalendarDateQuery, CalendarDateCommand],
    providers: [CalendarQuery, CalendarDateQuery, CalendarDateCommand],
})
export class CalendarLibsModule {}
