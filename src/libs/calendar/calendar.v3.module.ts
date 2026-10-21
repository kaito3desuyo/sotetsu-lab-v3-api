import { Module } from '@nestjs/common';
import { CalendarLibsModule } from './calendar.libs.module.js';
import { CalendarV3Controller } from './presentation/calendar.v3.controller.js';
import { CalendarV3Service } from './usecase/calendar.v3.service.js';

@Module({
    imports: [CalendarLibsModule],
    controllers: [CalendarV3Controller],
    providers: [CalendarV3Service],
})
export class CalendarV3Module {}
