import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray } from 'lodash';
import {
    getDayOfWeek,
    isHoliday,
    isNewYear,
    isSpecialCalendarAvailable,
} from 'src/core/utils/day-of-week';
import {
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Or,
    Repository,
} from 'typeorm';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import {
    buildCalendarDetailsDto,
    CalendarDtoBuilder,
} from '../builders/calendar-dto.builder';
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

    async findOneBySpecificDate(params: {
        date: string;
    }): Promise<CalendarDetailsDto> {
        const { date } = params;

        const format = 'YYYY-MM-DD';
        const dateInstance = dayjs(date, format);
        const dateString = dateInstance.format(format);

        const result = await this.calendarRepository.findOne({
            where: {
                startDate: Or(LessThanOrEqual(dateString), IsNull()),
                endDate: Or(MoreThanOrEqual(dateString), IsNull()),
                ...(isSpecialCalendarAvailable(dateString, format)
                    ? {
                          sunday: false,
                          monday: false,
                          tuesday: false,
                          wednesday: false,
                          thursday: false,
                          friday: false,
                          saturday: false,
                      }
                    : isHoliday(dateString, format) ||
                        isNewYear(dateString, format)
                      ? { sunday: true }
                      : {
                            [getDayOfWeek(dateString, format)]: true,
                        }),
            },
        });

        return CalendarDtoBuilder.toDetailsDto(result);
    }
}
