import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { buildCalendarDetailsDto } from '../builders/calendar-dto.builder';
import { CalendarModel } from '../models/calendar.model';

@Injectable()
export class CalendarQuery extends TypeOrmCrudService<CalendarModel> {
    constructor(
        @InjectRepository(CalendarModel)
        private readonly calendarRepository: Repository<CalendarModel>,
    ) {
        super(calendarRepository);
    }

    async findManyCalendars(
        query: CrudRequest,
    ): Promise<
        CalendarDetailsDto[] | GetManyDefaultResponse<CalendarDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildCalendarDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildCalendarDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneCalendar(query: CrudRequest): Promise<CalendarDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildCalendarDetailsDto(model);
    }
}
