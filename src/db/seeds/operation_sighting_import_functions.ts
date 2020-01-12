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

  if (
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-01-01' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-01-14' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-02-11' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-03-21' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-04-29' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-04-30' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-01' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-02' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-03' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-04' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-05' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-05-06' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-07-15' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-08-11' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-08-12' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-09-16' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-09-23' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-10-14' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-10-22' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-11-03' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-11-04' ||
    moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD') === '2019-11-23'
  ) {
    return 'sunday';
  }

  return dayOfWeek;

  /*
  const result = await axios.get(
    `http://s-proj.com/utils/checkHoliday.php?kind=h&date=${moment(
      date,
      'YYYY-MM-DD',
    ).format('YYYYMMDD')}`,
  );

  switch (result.data) {
    case 'else':
      return dayOfWeek;
    case 'holiday':
      return dayOfWeek === 'saturday' ? 'saturday' : 'sunday';
    default:
      return null;
  }
  */
}
