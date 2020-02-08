import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { operationSightingsSeedToSaveData } from '../seeds/operation_sighting_import_functions';
import operationSightingsSeed from '../seeds/operation_data_2017.json';
import { chunk } from 'lodash';
import { OperationSighting } from '../../main/v1/operation/operation-sighting.entity';

export class SeedOperationSighting20171581144665193
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const data = await operationSightingsSeedToSaveData(
      operationSightingsSeed as any[],
    );

    await Promise.all(
      chunk(data, 1000).map(async o => {
        return await getRepository(OperationSighting).insert(o);
      }),
    );
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}
