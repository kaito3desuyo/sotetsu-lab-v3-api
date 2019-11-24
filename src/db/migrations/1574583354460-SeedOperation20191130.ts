import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { Calendar } from '../../main/v1/calendar/calendar.entity';
import { Operation } from '../../main/v1/operation/operation.entity';

export class SeedOperation201911301574583354460 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const calendar = await getRepository(Calendar).find({
      where: { start_date: '2019-11-30' },
    });

    const data = calendar.map(c => {
      return operationNumbers.map(o => {
        return {
          calendar_id: c.id,
          operation_number: String(o.operation_number),
        };
      });
    });

    data.forEach(async o => {
      await getRepository(Operation).save(o);
    });
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}

const operationNumbers = [
  {
    operation_number: 11,
  },
  {
    operation_number: 12,
  },
  {
    operation_number: 13,
  },
  {
    operation_number: 14,
  },
  {
    operation_number: 15,
  },
  {
    operation_number: 16,
  },
  {
    operation_number: 17,
  },
  {
    operation_number: 18,
  },
  {
    operation_number: 19,
  },
  {
    operation_number: 41,
  },
  {
    operation_number: 42,
  },
  {
    operation_number: 43,
  },
  {
    operation_number: 44,
  },
  {
    operation_number: 45,
  },
  {
    operation_number: 46,
  },
  {
    operation_number: 47,
  },
  {
    operation_number: 48,
  },
  {
    operation_number: 49,
  },
  {
    operation_number: 51,
  },
  {
    operation_number: 52,
  },
  {
    operation_number: 53,
  },
  {
    operation_number: 54,
  },
  {
    operation_number: 55,
  },
  {
    operation_number: 56,
  },
  {
    operation_number: 57,
  },
  {
    operation_number: 58,
  },
  {
    operation_number: 59,
  },
  {
    operation_number: 61,
  },
  {
    operation_number: 62,
  },
  {
    operation_number: 63,
  },
  {
    operation_number: 64,
  },
  {
    operation_number: 65,
  },
  {
    operation_number: 66,
  },
  {
    operation_number: 67,
  },
  {
    operation_number: 68,
  },
  {
    operation_number: 69,
  },
  {
    operation_number: 71,
  },
  {
    operation_number: 72,
  },
  {
    operation_number: 73,
  },
  {
    operation_number: 74,
  },
  {
    operation_number: 75,
  },
  {
    operation_number: 76,
  },
  {
    operation_number: 77,
  },
  {
    operation_number: 78,
  },
  {
    operation_number: 79,
  },
  {
    operation_number: 91,
  },
  {
    operation_number: 92,
  },
  {
    operation_number: 93,
  },
  {
    operation_number: 94,
  },
  {
    operation_number: 95,
  },
  {
    operation_number: 96,
  },
  {
    operation_number: 97,
  },
  {
    operation_number: 98,
  },
  {
    operation_number: 99,
  },
  {
    operation_number: 100,
  },
];
