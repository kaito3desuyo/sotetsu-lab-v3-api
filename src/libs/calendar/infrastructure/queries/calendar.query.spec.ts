import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarDateModel } from '../models/calendar-date.model';
import { CalendarModel } from '../models/calendar.model';
import { CalendarQuery } from './calendar.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

function buildQueryBuilderMock(getManyResult: AnyMock) {
    const qb: Record<string, AnyMock> = {
        select: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        getMany: getManyResult,
    };
    qb.select.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    qb.andWhere.mockReturnValue(qb);
    return qb;
}

function buildWeekdayCalendar(id: string): Partial<CalendarModel> {
    return {
        id,
        serviceId: 'service-1',
        calendarName: '平日ダイヤ',
        sunday: false,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        startDate: '2020-01-01',
        endDate: null,
    };
}

function buildHolidayCalendar(id: string): Partial<CalendarModel> {
    return {
        id,
        serviceId: 'service-1',
        calendarName: '休日ダイヤ',
        sunday: true,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        startDate: '2020-01-01',
        endDate: null,
    };
}

describe('CalendarQuery - findOneBySpecificDate', () => {
    let calendarGetMany: AnyMock;
    let calendarDateGetMany: AnyMock;
    let calendarCreateQueryBuilder: AnyMock;
    let calendarDateCreateQueryBuilder: AnyMock;
    let query: CalendarQuery;

    beforeEach(async () => {
        calendarGetMany = jest.fn();
        calendarDateGetMany = jest.fn().mockResolvedValue([]);
        calendarCreateQueryBuilder = jest
            .fn()
            .mockImplementation(() => buildQueryBuilderMock(calendarGetMany));
        calendarDateCreateQueryBuilder = jest
            .fn()
            .mockImplementation(() => buildQueryBuilderMock(calendarDateGetMany));

        const mockCalendarRepository = {
            createQueryBuilder: calendarCreateQueryBuilder,
            metadata: {
                connection: { options: { type: 'postgres' } },
                columns: [],
                primaryColumns: [],
                relations: [],
                targetName: 'CalendarModel',
            },
        };
        const mockCalendarDateRepository = {
            createQueryBuilder: calendarDateCreateQueryBuilder,
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarQuery,
                {
                    provide: getRepositoryToken(CalendarModel),
                    useValue: mockCalendarRepository,
                },
                {
                    provide: getRepositoryToken(CalendarDateModel),
                    useValue: mockCalendarDateRepository,
                },
            ],
        }).compile();

        query = module.get<CalendarQuery>(CalendarQuery);
    });

    it('例外0件・平日（非祝日）の場合、曜日規則にマッチする平日ダイヤを返す（リグレッションなし）', async () => {
        const weekday = buildWeekdayCalendar('weekday-id');
        const holiday = buildHolidayCalendar('holiday-id');
        calendarGetMany.mockResolvedValue([weekday, holiday]);
        calendarDateGetMany.mockResolvedValue([]);

        const result = await query.findOneBySpecificDate({
            date: '2027-07-19', // Monday, 祝日一覧・特別ダイヤ一覧に含まれない日
        });

        expect(result.id).toBe('weekday-id');
    });

    it('平日ダイヤの祝日（未登録の新規祝日）に type2 + 休日ダイヤに type1 を登録すると休日ダイヤ判定になる', async () => {
        const weekday = buildWeekdayCalendar('weekday-id');
        const holiday = buildHolidayCalendar('holiday-id');
        calendarGetMany.mockResolvedValue([weekday, holiday]);
        calendarDateGetMany.mockResolvedValue([
            {
                calendarId: 'weekday-id',
                date: '2027-07-19',
                exceptionType: 2,
            },
            {
                calendarId: 'holiday-id',
                date: '2027-07-19',
                exceptionType: 1,
            },
        ]);

        const result = await query.findOneBySpecificDate({
            date: '2027-07-19', // Monday
        });

        expect(result.id).toBe('holiday-id');
    });

    it('土曜（曜日規則では非該当）に type1 を登録すると、当該カレンダーが判定に含まれる', async () => {
        const specialEvent: Partial<CalendarModel> = {
            ...buildWeekdayCalendar('special-event-id'),
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            calendarName: '臨時ダイヤ',
        };
        calendarGetMany.mockResolvedValue([specialEvent]);
        calendarDateGetMany.mockResolvedValue([
            {
                calendarId: 'special-event-id',
                date: '2027-08-14',
                exceptionType: 1,
            },
        ]);

        const result = await query.findOneBySpecificDate({
            date: '2027-08-14', // Saturday
        });

        expect(result.id).toBe('special-event-id');
    });

    it('期間内に候補カレンダーが存在しない場合は例外テーブルへの IN 句クエリを発行しない', async () => {
        calendarGetMany.mockResolvedValue([]);

        await query.findOneBySpecificDate({ date: '2027-07-19' });

        expect(calendarDateCreateQueryBuilder).not.toHaveBeenCalled();
    });
});
