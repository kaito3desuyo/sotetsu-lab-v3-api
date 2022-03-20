import { Module } from '@nestjs/common';
import { CalendarLibsModule } from './calendar.libs.module';
import { CalendarV2Controller } from './presentation/calendar.v2.controller';
import { CalendarV2Service } from './usecase/calendar.v2.service';

@Module({
    imports: [CalendarLibsModule],
    controllers: [CalendarV2Controller],
    providers: [CalendarV2Service],
})
export class CalendarV2Module {}
