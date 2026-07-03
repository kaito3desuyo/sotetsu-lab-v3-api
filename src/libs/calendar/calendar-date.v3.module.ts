import { Module } from '@nestjs/common';
import { CalendarLibsModule } from './calendar.libs.module';
import { CalendarDateV3Controller } from './presentation/calendar-date.v3.controller';
import { CalendarDateV3Service } from './usecase/calendar-date.v3.service';

@Module({
    imports: [CalendarLibsModule],
    controllers: [CalendarDateV3Controller],
    providers: [CalendarDateV3Service],
})
export class CalendarDateV3Module {}
