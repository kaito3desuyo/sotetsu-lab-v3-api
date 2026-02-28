import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModel } from './infrastructure/models/calendar.model';
import { CalendarQuery } from './infrastructure/queries/calendar.query';

@Module({
    imports: [TypeOrmModule.forFeature([CalendarModel])],
    exports: [CalendarQuery],
    providers: [CalendarQuery],
})
export class CalendarLibsModule {}
