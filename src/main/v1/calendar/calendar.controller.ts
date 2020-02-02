import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpService,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Calendar } from './calendar.entity';
import { CalendarService } from './calendar.service';
import { SelectQueryBuilder, Brackets } from 'typeorm';
import { QueryBuilderFunctions } from '../../../shared/classes/query-builder-functions';
import moment from 'moment';
import { Observable, of } from 'rxjs';
import { AuthGuard } from './../../../shared/guards/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private http: HttpService,
  ) {}

  @Get()
  async getCalendars(): Promise<{ calendars: Calendar[] }> {
    const calendars = await this.calendarService.findAll();
    return { calendars };
  }

  @Get('/search')
  async searchCalendars(@Query() query: { date: string }): Promise<{
    calendars: Calendar[];
  }> {
    const qbFunctions = new QueryBuilderFunctions<Calendar>();
    const calendarQueryBuilder = this.calendarService.createQueryBuilder();
    let searchQuery: SelectQueryBuilder<Calendar> = calendarQueryBuilder;

    if (query.date) {
      searchQuery = qbFunctions.searchDate(query.date, searchQuery);

      const dayOfWeek = await this.fetchWeekdayOrHoliday(
        query.date,
      ).toPromise();
      searchQuery = searchQuery.andWhere(`${dayOfWeek} = true`);
    }

    const calendars = await searchQuery.getMany();

    return { calendars };
  }

  @Get('/:id')
  async getCalendarById(
    @Param('id') id: string,
  ): Promise<{ calendar: Calendar }> {
    const calendar = await this.calendarService.findOne({
      where: {
        id,
      },
    });
    return { calendar };
  }

  private fetchWeekdayOrHoliday(date: string): Observable<string> {
    const dayOfWeek = moment(date, 'YYYY-MM-DD')
      .format('dddd')
      .toLowerCase();

    if (
      // 2019-2020年設定
      moment(date, 'YYYY-MM-DD').format('MM-DD') === '12-30' ||
      moment(date, 'YYYY-MM-DD').format('MM-DD') === '12-31' ||
      moment(date, 'YYYY-MM-DD').format('MM-DD') === '01-01' ||
      moment(date, 'YYYY-MM-DD').format('MM-DD') === '01-02' ||
      moment(date, 'YYYY-MM-DD').format('MM-DD') === '01-03'
    ) {
      return of('sunday');
    }

    if (
      holidays.some(o => o === moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD'))
    ) {
      return of('sunday');
    }

    return of(dayOfWeek);

    /*
    return this.http
      .get(
        `http://s-proj.com/utils/checkHoliday.php?kind=h&date=${moment(
          date,
          'YYYY-MM-DD',
        ).format('YYYYMMDD')}`,
      )
      .pipe(
        map((res: AxiosResponse<string>) => {
          switch (res.data) {
            case 'else':
              return dayOfWeek;
            case 'holiday':
              return dayOfWeek === 'saturday' ? 'saturday' : 'sunday';
            default:
              return null;
          }
        }),
      );
    */
  }
}

const holidays = [
  // 2018
  '2018-01-01',
  '2018-01-08',
  '2018-02-11',
  '2018-02-12',
  '2018-03-21',
  '2018-04-29',
  '2018-04-30',
  '2018-05-03',
  '2018-05-04',
  '2018-05-05',
  '2018-07-16',
  '2018-08-11',
  '2018-09-17',
  '2018-09-23',
  '2018-09-24',
  '2018-10-08',
  '2018-11-03',
  '2018-11-23',
  '2018-12-23',
  '2018-12-24',
  // 2019
  '2019-01-01',
  '2019-01-14',
  '2019-02-11',
  '2019-03-21',
  '2019-04-29',
  '2019-04-30',
  '2019-05-01',
  '2019-05-02',
  '2019-05-03',
  '2019-05-04',
  '2019-05-05',
  '2019-05-06',
  '2019-07-15',
  '2019-08-11',
  '2019-08-12',
  '2019-09-16',
  '2019-09-23',
  '2019-10-14',
  '2019-10-22',
  '2019-11-03',
  '2019-11-04',
  '2019-11-23',
  // 2020
  '2020-01-01',
  '2020-01-13',
  '2020-02-11',
  '2020-02-23',
  '2020-02-24',
  '2020-03-20',
  '2020-04-29',
  '2020-05-03',
  '2020-05-04',
  '2020-05-05',
  '2020-05-06',
  '2020-07-23',
  '2020-07-24',
  '2020-08-10',
  '2020-09-21',
  '2020-09-22',
  '2020-11-03',
  '2020-11-23',
];
