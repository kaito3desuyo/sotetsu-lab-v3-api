import { MigrationInterface, QueryRunner, getRepository, DeepPartial } from "typeorm";
import * as tripsSeed from '../seeds/operation_table_20181208.json'
import { Trip } from "../../main/v1/trip/trip.entity";
import { tripsSeedToSaveData } from "../seeds/trips_seed_import_functions";


export class SeedTrip201812081567264708713 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        const data = await tripsSeedToSaveData(tripsSeed, '2018-12-08');

        const promises = data.map(trip => {
            return getRepository(Trip).save(trip)
        })
        await Promise.all(promises)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}
