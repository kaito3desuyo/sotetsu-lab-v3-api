import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/core/auth/auth.module';
import { CalendarModel } from './infrastructure/models/calendar.model';
import { CalendarQuery } from './infrastructure/queries/calendar.query';

@Module({
    imports: [TypeOrmModule.forFeature([CalendarModel]), AuthModule],
    exports: [CalendarQuery],
    providers: [CalendarQuery],
})
export class CalendarLibsModule {}
