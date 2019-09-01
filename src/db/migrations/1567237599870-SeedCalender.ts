import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Calender } from '../../main/v1/calender/calender.entity';
import { Service } from '../../main/v1/service/service.entity';
import { find } from 'lodash';
// tslint:disable: max-line-length
export class SeedCalender1567237599870 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const services = await getRepository(Service).find();

    const calenders = calendersSeed.map(calender => {
      calender['service_id'] = find(
        services,
        service =>
          service.service_name ===
          '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
      ).id;
      return calender;
    });

    await getRepository(Calender).save(calenders);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const calendersSeed: Partial<Calender>[] = [
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2009-11-01'),
    end_date: new Date('2012-04-28'),
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2009-11-01'),
    end_date: new Date('2012-04-28'),
  },
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2012-04-29'),
    end_date: new Date('2014-04-26'),
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2012-04-29'),
    end_date: new Date('2014-04-26'),
  },
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2014-04-27'),
    end_date: new Date('2015-05-30'),
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2014-04-27'),
    end_date: new Date('2015-05-30'),
  },
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2015-05-31'),
    end_date: new Date('2017-03-17'),
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2015-05-31'),
    end_date: new Date('2017-03-17'),
  },
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2017-03-18'),
    end_date: new Date('2018-12-07'),
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2017-03-18'),
    end_date: new Date('2018-12-07'),
  },
  {
    calender_name: '平日ダイヤ',
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    start_date: new Date('2018-12-08'),
    end_date: null,
  },
  {
    calender_name: '土休日ダイヤ',
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: true,
    start_date: new Date('2018-12-08'),
    end_date: null,
  },
];
