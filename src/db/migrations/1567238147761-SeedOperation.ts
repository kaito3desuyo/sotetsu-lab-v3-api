import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Calender } from '../../main/v1/calender/calender.entity';
import { find } from 'lodash';
import { Operation } from '../../main/v1/operation/operation.entity';

// tslint:disable: max-line-length
export class SeedOperation1567238147761 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const calenders = (await getRepository(Calender).find()) as any;
    const operations = [];
    operationsSeed.forEach(seed => {
      const temp = seed.operations.map(operation => {
        return {
          calender_id: find(
            calenders,
            calender =>
              calender.calender_name === seed.calender_name &&
              calender.start_date === seed.start_date,
          ).id,
          operation_number: operation.operation_number,
        };
      });

      temp.forEach(tmp => operations.push(tmp));
    });

    await getRepository(Operation).save(operations);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const operationsSeed: Array<{
  calender_name: string;
  start_date: string;
  operations: Array<{ operation_number: string }>;
}> = [
  {
    calender_name: '平日ダイヤ',
    start_date: '2009-11-01',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2009-11-01',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '平日ダイヤ',
    start_date: '2012-04-29',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2012-04-29',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '平日ダイヤ',
    start_date: '2014-04-27',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2014-04-27',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '21',
      },
      {
        operation_number: '22',
      },
      {
        operation_number: '23',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '平日ダイヤ',
    start_date: '2015-05-31',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2015-05-31',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '平日ダイヤ',
    start_date: '2017-03-18',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2017-03-18',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '平日ダイヤ',
    start_date: '2018-12-08',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
  {
    calender_name: '土休日ダイヤ',
    start_date: '2018-12-08',
    operations: [
      {
        operation_number: '11',
      },
      {
        operation_number: '12',
      },
      {
        operation_number: '13',
      },
      {
        operation_number: '14',
      },
      {
        operation_number: '15',
      },
      {
        operation_number: '16',
      },
      {
        operation_number: '17',
      },
      {
        operation_number: '18',
      },
      {
        operation_number: '19',
      },
      {
        operation_number: '41',
      },
      {
        operation_number: '42',
      },
      {
        operation_number: '43',
      },
      {
        operation_number: '44',
      },
      {
        operation_number: '45',
      },
      {
        operation_number: '46',
      },
      {
        operation_number: '47',
      },
      {
        operation_number: '48',
      },
      {
        operation_number: '49',
      },
      {
        operation_number: '51',
      },
      {
        operation_number: '52',
      },
      {
        operation_number: '53',
      },
      {
        operation_number: '54',
      },
      {
        operation_number: '55',
      },
      {
        operation_number: '56',
      },
      {
        operation_number: '57',
      },
      {
        operation_number: '58',
      },
      {
        operation_number: '59',
      },
      {
        operation_number: '61',
      },
      {
        operation_number: '62',
      },
      {
        operation_number: '63',
      },
      {
        operation_number: '64',
      },
      {
        operation_number: '65',
      },
      {
        operation_number: '66',
      },
      {
        operation_number: '67',
      },
      {
        operation_number: '68',
      },
      {
        operation_number: '69',
      },
      {
        operation_number: '100',
      },
    ],
  },
];
