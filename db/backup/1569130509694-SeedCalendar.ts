import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Service } from '../../main/v1/service/service.entity';
import { find } from 'lodash';
import { Calendar } from '../../main/v1/calendar/calendar.entity';

export class SeedCalendar1569130509694 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const services = await getRepository(Service).find();

    const calendars = calendarsSeed.map(calender => {
      const temp = {
        ...calender,
        service_id: find(
          services,
          service =>
            service.service_name ===
            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        ).id,
      };
      return temp;
    });

    await getRepository(Calendar).save(calendars);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const calendarsSeed: Array<Partial<Calendar>> = [
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2009-11-01',
    end_date: '2012-04-28',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2009-11-01',
    end_date: '2012-04-28',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2012-04-29',
    end_date: '2014-04-26',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2012-04-29',
    end_date: '2014-04-26',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2014-04-27',
    end_date: '2015-05-30',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2014-04-27',
    end_date: '2015-05-30',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2015-05-31',
    end_date: '2017-03-17',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2015-05-31',
    end_date: '2017-03-17',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2017-03-18',
    end_date: '2018-12-07',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2017-03-18',
    end_date: '2018-12-07',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2018-12-08',
    end_date: '2019-11-29',
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2018-12-08',
    end_date: '2019-11-29',
  },
  {
    calendar_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: '2019-11-30',
    end_date: null,
  },
  {
    calendar_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: '2019-11-30',
    end_date: null,
  },
];
