import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarDatesDtoBuilder } from '../builders/calendar-date.dto.builder';
import { CalendarDateModel } from '../models/calendar-date.model';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';

@Injectable()
export class CalendarDateQuery {
    constructor(
        @InjectRepository(CalendarDateModel)
        private readonly calendarDateRepository: Repository<CalendarDateModel>,
    ) {}

    async findMany(params: {
        calendarId?: string;
        from?: string;
        to?: string;
    }): Promise<CalendarDateDetailsDto[]> {
        const { calendarId, from, to } = params;

        let qb = this.calendarDateRepository
            .createQueryBuilder('calendarDate')
            .select('calendarDate')
            .orderBy('calendarDate.date', 'ASC');

        if (calendarId) {
            qb = qb.andWhere('calendarDate.calendar_id = :calendarId', {
                calendarId,
            });
        }

        if (from) {
            qb = qb.andWhere('calendarDate.date >= :from', { from });
        }

        if (to) {
            qb = qb.andWhere('calendarDate.date <= :to', { to });
        }

        const models = await qb.getMany();

        return CalendarDatesDtoBuilder.buildFromModel(models);
    }
}
