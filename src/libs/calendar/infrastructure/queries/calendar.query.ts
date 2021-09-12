import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { getDayOfWeek, isHoliday, isNewYear } from 'src/core/util/day-of-week';
import { Brackets, Repository } from 'typeorm';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarFindManyBySpecificDateParam } from '../../usecase/params/calendar-find-many-by-specific-date.param';
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

    async findManyCalendarsBySpecificDate(
        query: CrudRequest,
        params: CalendarFindManyBySpecificDateParam,
    ): Promise<
        CalendarDetailsDto[] | GetManyDefaultResponse<CalendarDetailsDto>
    > {
        const qb = await this.createBuilder(query.parsed, query.options, true);
        const customQb = (query.parsed.filter.length === 0
            ? qb.where(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.date,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
            : qb.andWhere(
                  new Brackets((subqb) => {
                      return subqb
                          .where('start_date <= :startDate', {
                              startDate: params.date,
                          })
                          .orWhere('start_date IS NULL');
                  }),
              )
        )
            .andWhere(
                new Brackets((subqb) => {
                    return subqb
                        .where(':endDate <= end_date', {
                            endDate: params.date,
                        })
                        .orWhere('end_date IS NULL');
                }),
            )
            .andWhere(
                isHoliday(params.date) || isNewYear(params.date)
                    ? 'sunday = true'
                    : `${getDayOfWeek(params.date)} = true`,
            );

        const models = await this.doGetMany(
            customQb,
            query.parsed,
            query.options,
        );

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
