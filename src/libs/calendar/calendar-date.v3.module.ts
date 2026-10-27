import { Module } from '@nestjs/common';
import { CdnInvalidationModule } from '../../core/modules/cdn-invalidation/cdn-invalidation.module.js';
import { CalendarLibsModule } from './calendar.libs.module.js';
import { CalendarDateV3Controller } from './presentation/calendar-date.v3.controller.js';
import { CalendarDateV3Service } from './usecase/calendar-date.v3.service.js';

@Module({
    imports: [CalendarLibsModule, CdnInvalidationModule],
    controllers: [CalendarDateV3Controller],
    providers: [CalendarDateV3Service],
})
export class CalendarDateV3Module {}
