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
import { map } from 'rxjs/operators';
import { AxiosResponse } from 'axios';
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

    // return of(dayOfWeek);

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
  }
}
