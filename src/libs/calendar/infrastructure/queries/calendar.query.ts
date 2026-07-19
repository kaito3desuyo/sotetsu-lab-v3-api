import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray } from 'lodash';
import { getDayOfWeek } from 'src/core/utils/day-of-week';
import { Repository } from 'typeorm';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import {
    CalendarDtoBuilder,
    CalendarsDtoBuilder,
} from '../builders/calendar.dto.builder';
import { CalendarDateModel } from '../models/calendar-date.model';
import { CalendarModel } from '../models/calendar.model';
import { resolveCalendarIdBySpecificDate } from './resolve-calendar-id-by-specific-date';

@Injectable()
export class CalendarQuery extends TypeOrmCrudService<CalendarModel> {
    constructor(
        @InjectRepository(CalendarModel)
        private readonly calendarRepository: Repository<CalendarModel>,
        @InjectRepository(CalendarDateModel)
        private readonly calendarDateRepository: Repository<CalendarDateModel>,
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
            return CalendarsDtoBuilder.buildFromModel(models);
        } else {
            const data = CalendarsDtoBuilder.buildFromModel(models.data);
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

        return CalendarDtoBuilder.buildFromModel(model);
    }

    async findOneById(params: {
        id: string;
    }): Promise<CalendarDetailsDto> {
        const { id } = params;

        const model = await this.calendarRepository
            .createQueryBuilder('calendar')
            .select('calendar')
            .where('calendar.id = :id', { id })
            .getOne();

        if (!model) {
            return null;
        }

        return CalendarDtoBuilder.buildFromModel(model);
    }

    async findManyByServiceName(params: {
        serviceName?: string;
    }): Promise<CalendarDetailsDto[]> {
        const { serviceName } = params;

        let qb = this.calendarRepository
            .createQueryBuilder('calendar')
            .select('calendar')
            .innerJoin('calendar.service', 'service')
            .orderBy('calendar.startDate', 'ASC')
            .addOrderBy('calendar.monday', 'DESC');

        if (serviceName) {
            qb = qb.where('service.service_name = :serviceName', {
                serviceName,
            });
        }

        const models = await qb.getMany();
        return CalendarsDtoBuilder.buildFromModel(models);
    }

    async findOneBySpecificDate(params: {
        date: string;
    }): Promise<CalendarDetailsDto> {
        const { date } = params;

        const format = 'YYYY-MM-DD';
        const dateInstance = dayjs(date, format);
        const dateString = dateInstance.format(format);

        // 曜日規則の判定に必要な期間内の全カレンダーを候補として取得する。
        // （calendar_dates による type1 追加は曜日規則に関わらず候補になり得るため、
        //   従来のように曜日条件で SQL 側に絞り込まない）
        const candidates = await this.calendarRepository
            .createQueryBuilder('calendar')
            .select('calendar')
            .where(
                '(calendar.start_date <= :date OR calendar.start_date IS NULL)',
                { date: dateString },
            )
            .andWhere(
                '(calendar.end_date >= :date OR calendar.end_date IS NULL)',
                { date: dateString },
            )
            .getMany();

        if (candidates.length === 0) {
            return CalendarDtoBuilder.buildFromModel(undefined);
        }

        const dayOfWeekMatches = this.buildDayOfWeekMatcher(dateString, format);

        const exceptionModels = await this.calendarDateRepository
            .createQueryBuilder('calendarDate')
            .select('calendarDate')
            .where('calendarDate.date = :date', { date: dateString })
            .andWhere('calendarDate.calendar_id IN (:...calendarIds)', {
                calendarIds: candidates.map((candidate) => candidate.id),
            })
            .getMany();

        const resolvedCalendarId = resolveCalendarIdBySpecificDate({
            candidates: candidates.map((candidate) => ({
                id: candidate.id,
                dayOfWeekMatches: dayOfWeekMatches(candidate),
            })),
            exceptions: exceptionModels.map((exception) => ({
                calendarId: exception.calendarId,
                exceptionType: exception.exceptionType,
            })),
        });

        const result = resolvedCalendarId
            ? candidates.find((candidate) => candidate.id === resolvedCalendarId)
            : undefined;

        return CalendarDtoBuilder.buildFromModel(result);
    }

    /**
     * 素の曜日規則のみを判定するマッチャーを構築する。
     *
     * 祝日・年末年始・特別ダイヤといった曜日規則の例外は、
     * calendar_dates（type1=追加/type2=除外）と resolveCalendarIdBySpecificDate の
     * 合成に一本化済みのため、ここではハードコードした例外分岐を持たない
     * （T7.3 でハードコード判定を撤去。旧3分岐ロジックは
     * verification/legacy-day-of-week-matcher.ts に凍結し、等価ゲートの
     * 旧経路参照としてのみ残している）。
     */
    private buildDayOfWeekMatcher(
        dateString: string,
        format: string,
    ): (calendar: CalendarModel) => boolean {
        const dayOfWeek = getDayOfWeek(dateString, format);
        return (calendar) =>
            (calendar as unknown as Record<string, boolean>)[dayOfWeek] === true;
    }
}
