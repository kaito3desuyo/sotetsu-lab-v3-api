import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import * as tripsSeed from '../seeds/operation_table_20181208.json';
import { tripsSeedToSaveData } from '../seeds/trips_seed_import_functions';
import { TripBlock } from '../../main/v1/trip/trip_block.entity';
// tslint:disable: max-line-length
export class SeedTrip201812081567318928590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const data = await tripsSeedToSaveData(tripsSeed, '2018-12-08');

    const promises = data.map(trip => {
      return getRepository(TripBlock).save({ trips: [trip] });
    });
    await Promise.all(promises);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}
