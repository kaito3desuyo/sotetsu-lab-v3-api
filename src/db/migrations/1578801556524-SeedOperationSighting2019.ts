import {
  MigrationInterface,
  QueryRunner,
  getRepository,
  getConnection,
} from 'typeorm';
import operationSightingsSeed from '../seeds/operation_data_2019.json';
import { operationSightingsSeedToSaveData } from '../seeds/operation_sighting_import_functions';
import { OperationSighting } from '../../main/v1/operation/operation-sighting.entity';
import { chunk } from 'lodash';

export class SeedOperationSighting20191578801556524
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

  public async down(queryRunner: QueryRunner): Promise<any> {}
}
