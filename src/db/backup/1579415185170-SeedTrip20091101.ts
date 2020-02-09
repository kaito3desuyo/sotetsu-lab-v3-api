import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { tripsSeedToSaveData } from '../seeds/trips_seed_import_functions';
import { TripBlock } from '../../main/v1/trip/trip_block.entity';
import { find } from 'lodash';
import { TripOperationList } from '../../main/v1/trip-operation-list/trip_operation_list.entity';
import * as tripsSeed from '../seeds/operation_table_20091101.json';

export class SeedTrip200911011579415185170 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const data = await tripsSeedToSaveData(tripsSeed, '2009-11-01');

    const promises = data.map(seed => {
      return getRepository(TripBlock).save({ trips: [seed.trip] });
    });
    const results: TripBlock[] = await Promise.all(promises);

    const tripOperationList = [];
    results.forEach(result => {
      result.trips.forEach(trip => {
        const tripId = trip.id;

        const operationId = find(
          data,
          seed =>
            seed.trip.trip_number === trip.trip_number &&
            seed.trip.calendar_id === trip.calendar_id,
        ).trip_operation_list.operation_id;

        if (!operationId) {
          return true;
        }

        const startTime = find(trip.times, time => time.arrival_time === null);
        const endTime = find(trip.times, time => time.departure_time === null);

        tripOperationList.push({
          trip_id: tripId,
          operation_id: operationId,
          start_station_id: startTime.station_id,
          end_station_id: endTime.station_id,
          start_time_id: startTime.id,
          end_time_id: endTime.id,
        });
      });
    });

    const promises2 = tripOperationList.map(seed => {
      return getRepository(TripOperationList).save(seed);
    });
    const results2 = await Promise.all(promises2);
  }

  // tslint:disable-next-line: no-empty
  public async down(queryRunner: QueryRunner): Promise<any> {}
}
