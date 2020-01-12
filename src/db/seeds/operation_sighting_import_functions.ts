import { getRepository } from 'typeorm';
import { Formation } from '../../main/v1/formation/formation.entity';
import { Operation } from '../../main/v1/operation/operation.entity';
import moment from 'moment';
import axios from 'axios';
import { find } from 'lodash';

export async function operationSightingsSeedToSaveData(seedData: any[]) {
  const formations = await getRepository(Formation).find();
  const operations = await getRepository(Operation).find({
    relations: ['calendar'],
  });

  const data = seedData
    .filter(row => {
      return row.operation_id && moment(row.last_update_timestamp).hour() !== 2;
    })
    .map(async row => {
      const weekdayOrHoliday = await fetchWeekdayOrHoliday(
        moment(row.witness_timestamp)
          .subtract(moment(row.witness_timestamp).hour() < 4 ? 1 : 0, 'days')
          .format('YYYY-MM-DD'),
      );

      const formation = find(
        formations,
        o =>
          o.formation_number === row.vehicle_id &&
          (o.start_date === null ||
            moment(o.start_date, 'YYYY-MM-DD') <=
              moment(row.witness_timestamp).subtract(
                moment(row.witness_timestamp).hour() < 4 ? 1 : 0,
                'days',
              )) &&
          (o.end_date === null ||
            moment(o.end_date, 'YYYY-MM-DD')
              .add(1, 'days')
              .subtract(1, 'millisecond') >=
              moment(row.witness_timestamp).subtract(
                moment(row.witness_timestamp).hour() < 4 ? 1 : 0,
                'days',
              )),
      );

      const operation = find(
        operations,
        o =>
          o.operation_number === row.operation_id &&
          o.calendar[weekdayOrHoliday] === true &&
          (o.calendar.start_date === null ||
            moment(o.calendar.start_date, 'YYYY-MM-DD') <=
              moment(row.witness_timestamp).subtract(
                moment(row.witness_timestamp).hour() < 4 ? 1 : 0,
                'days',
              )) &&
          (o.calendar.end_date === null ||
            moment(o.calendar.end_date, 'YYYY-MM-DD')
              .add(1, 'days')
              .subtract(1, 'millisecond') >=
              moment(row.witness_timestamp).subtract(
                moment(row.witness_timestamp).hour() < 4 ? 1 : 0,
                'days',
              )),
      );

      return {
        formation_id: formation ? formation.id : undefined,
        operation_id: operation ? operation.id : undefined,
        sighting_time: row.witness_timestamp,
        created_at: row.last_update_timestamp,
        updated_at: row.last_update_timestamp,
      };
    });

  const result = await Promise.all(data);

  return result.filter(o => o.formation_id && o.operation_id);
}

async function fetchWeekdayOrHoliday(date: string): Promise<string> {
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
    return 'sunday';
  }

  if (holidays.some(o => moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD'))) {
    return 'sunday';
  }

  return dayOfWeek;
}

const holidays = [
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
