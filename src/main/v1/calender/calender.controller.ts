import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpService,
  Param,
} from '@nestjs/common';
import { Calender } from './calender.entity';
import { CalenderService } from './calender.service';
import { SelectQueryBuilder, Brackets } from 'typeorm';
import { QueryBuilderFunctions } from '../../../shared/classes/query-builder-functions';
import moment from 'moment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AxiosResponse } from 'axios';

@Controller()
export class CalenderController {
  constructor(
    private calenderService: CalenderService,
    private http: HttpService,
  ) {}

  @Get()
  async getCalenders(): Promise<{ calenders: Calender[] }> {
    const calenders = await this.calenderService.findAll();
    return { calenders };
  }

  @Get('/search')
  async searchCalenders(@Query() query: { date: string }): Promise<{
    calenders: Calender[];
  }> {
    const qbFunctions = new QueryBuilderFunctions<Calender>();
    const calenderQueryBuilder = this.calenderService.createQueryBuilder();
    let searchQuery: SelectQueryBuilder<Calender> = calenderQueryBuilder;

    if (query.date) {
      searchQuery = qbFunctions.searchDate(query.date, searchQuery);

      const dayOfWeek = await this.fetchWeekdayOrHoliday(
        query.date,
      ).toPromise();
      searchQuery = searchQuery.andWhere(`${dayOfWeek} = true`);
    }

    const calenders = await searchQuery.getMany();

    return { calenders };
  }

  @Get('/:id')
  async getCalenderById(
    @Param('id') id: string,
  ): Promise<{ calender: Calender }> {
    const calender = await this.calenderService.findOne({
      where: {
        id,
      },
    });
    return { calender };
  }

  private fetchWeekdayOrHoliday(date: string): Observable<string> {
    const dayOfWeek = moment(date, 'YYYY-MM-DD')
      .format('dddd')
      .toLowerCase();

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
