import { getRepository } from 'typeorm';
import { Formation } from '../../main/v1/formation/formation.entity';
import { Operation } from '../../main/v1/operation/operation.entity';
import moment from 'moment-timezone';
import { find, some } from 'lodash';
moment.tz.setDefault('Asia/Tokyo');

export async function operationSightingsSeedToSaveData(seedData: any[]) {
    const formations = await getRepository(Formation).find();
    const operations = await getRepository(Operation).find({
        relations: ['calendar'],
    });

    const data = seedData
        .filter((row) => {
            return (
                row.operation_id &&
                moment
                    .tz(row.last_update_timestamp, 'Asia/Tokyo')
                    .format('HH') !== '02' &&
                moment.tz(row.witness_timestamp, 'Asia/Tokyo') <=
                    moment.tz(row.last_update_timestamp, 'Asia/Tokyo')
            );
        })
        .map(async (row) => {
            const weekdayOrHoliday = await fetchWeekdayOrHoliday(
                moment
                    .tz(row.witness_timestamp, 'Asia/Tokyo')
                    .subtract(
                        moment.tz(row.witness_timestamp, 'Asia/Tokyo').hour() <
                            4
                            ? 1
                            : 0,
                        'days',
                    )
                    .format('YYYY-MM-DD'),
            );

            console.log('day:', weekdayOrHoliday);

            const formation = find(
                formations,
                (o) =>
                    o.formation_number === row.vehicle_id &&
                    (o.start_date === null ||
                        moment.tz(o.start_date, 'YYYY-MM-DD', 'Asia/Tokyo') <=
                            moment
                                .tz(row.witness_timestamp, 'Asia/Tokyo')
                                .subtract(
                                    moment
                                        .tz(row.witness_timestamp, 'Asia/Tokyo')
                                        .hour() < 4
                                        ? 1
                                        : 0,
                                    'days',
                                )) &&
                    (o.end_date === null ||
                        moment
                            .tz(o.end_date, 'YYYY-MM-DD', 'Asia/Tokyo')
                            .add(1, 'days')
                            .subtract(1, 'millisecond') >=
                            moment
                                .tz(row.witness_timestamp, 'Asia/Tokyo')
                                .subtract(
                                    moment
                                        .tz(row.witness_timestamp, 'Asia/Tokyo')
                                        .hour() < 4
                                        ? 1
                                        : 0,
                                    'days',
                                )),
            );

            const operation = find(
                operations,
                (o) =>
                    o.operation_number === row.operation_id &&
                    o.calendar[weekdayOrHoliday] === true &&
                    (o.calendar.start_date === null ||
                        moment.tz(
                            o.calendar.start_date,
                            'YYYY-MM-DD',
                            'Asia/Tokyo',
                        ) <=
                            moment
                                .tz(row.witness_timestamp, 'Asia/Tokyo')
                                .subtract(
                                    moment
                                        .tz(row.witness_timestamp, 'Asia/Tokyo')
                                        .hour() < 4
                                        ? 1
                                        : 0,
                                    'days',
                                )) &&
                    (o.calendar.end_date === null ||
                        moment
                            .tz(o.calendar.end_date, 'YYYY-MM-DD', 'Asia/Tokyo')
                            .add(1, 'days')
                            .subtract(1, 'millisecond') >=
                            moment
                                .tz(row.witness_timestamp, 'Asia/Tokyo')
                                .subtract(
                                    moment
                                        .tz(row.witness_timestamp, 'Asia/Tokyo')
                                        .hour() < 4
                                        ? 1
                                        : 0,
                                    'days',
                                )),
            );

            return {
                formation_id: formation ? formation.id : undefined,
                operation_id: operation ? operation.id : undefined,
                sighting_time: moment
                    .tz(row.witness_timestamp, 'Asia/Tokyo')
                    .toISOString(true),
                created_at: moment
                    .tz(row.last_update_timestamp, 'Asia/Tokyo')
                    .toISOString(true),
                updated_at: moment
                    .tz(row.last_update_timestamp, 'Asia/Tokyo')
                    .toISOString(true),
            };
        });

    const result = await Promise.all(data);

    return result.filter((o) => o.formation_id && o.operation_id);
}

async function fetchWeekdayOrHoliday(date: string): Promise<string> {
    console.log('date:', date);
    const dayOfWeek = moment
        .tz(date, 'YYYY-MM-DD', 'Asia/Tokyo')
        .format('dddd')
        .toLowerCase();

    if (
        // 2019-2020年設定
        moment.tz(date, 'YYYY-MM-DD', 'Asia/Tokyo').format('MM-DD') ===
            '12-30' ||
        moment.tz(date, 'YYYY-MM-DD', 'Asia/Tokyo').format('MM-DD') ===
            '12-31' ||
        moment.tz(date, 'YYYY-MM-DD', 'Asia/Tokyo').format('MM-DD') ===
            '01-01' ||
        moment.tz(date, 'YYYY-MM-DD', 'Asia/Tokyo').format('MM-DD') ===
            '01-02' ||
        moment.tz(date, 'YYYY-MM-DD', 'Asia/Tokyo').format('MM-DD') === '01-03'
    ) {
        return 'sunday';
    }

    if (
        holidays.some(
            (o) =>
                o ===
                moment
                    .tz(date, 'YYYY-MM-DD', 'Asia/Tokyo')
                    .format('YYYY-MM-DD'),
        )
    ) {
        return 'sunday';
    }

    return dayOfWeek;
}

const holidays = [
    // 2014
    '2014-01-01',
    '2014-01-13',
    '2014-02-11',
    '2014-03-21',
    '2014-04-29',
    '2014-05-03',
    '2014-05-04',
    '2014-05-05',
    '2014-05-06',
    '2014-07-21',
    '2014-09-15',
    '2014-09-23',
    '2014-10-13',
    '2014-11-03',
    '2014-11-23',
    '2014-11-24',
    '2014-12-23',
    // 2015
    '2015-01-01',
    '2015-01-12',
    '2015-02-11',
    '2015-03-21',
    '2015-04-29',
    '2015-05-03',
    '2015-05-04',
    '2015-05-05',
    '2015-05-06',
    '2015-07-20',
    '2015-09-21',
    '2015-09-22',
    '2015-09-23',
    '2015-10-12',
    '2015-11-03',
    '2015-11-23',
    '2015-12-23',
    // 2016
    '2016-01-01',
    '2016-01-11',
    '2016-02-11',
    '2016-03-20',
    '2016-03-21',
    '2016-04-29',
    '2016-05-03',
    '2016-05-04',
    '2016-05-05',
    '2016-07-18',
    '2016-08-11',
    '2016-09-19',
    '2016-09-22',
    '2016-10-10',
    '2016-11-03',
    '2016-11-23',
    '2016-12-23',
    // 2017
    '2017-01-01',
    '2017-01-02',
    '2017-01-09',
    '2017-02-11',
    '2017-03-20',
    '2017-04-29',
    '2017-05-03',
    '2017-05-04',
    '2017-05-05',
    '2017-07-17',
    '2017-08-11',
    '2017-09-18',
    '2017-09-23',
    '2017-10-09',
    '2017-11-03',
    '2017-11-23',
    '2017-12-23',
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
    // 2021
    '2021-01-01',
    '2021-01-11',
    '2021-02-11',
    '2021-02-23',
    '2021-03-20',
    '2021-04-29',
    '2021-05-03',
    '2021-05-04',
    '2021-05-05',
    '2021-07-22',
    '2021-07-23',
    '2021-08-08',
    '2021-08-09',
    '2021-09-20',
    '2021-09-23',
    '2021-11-03',
    '2021-11-23',
];
