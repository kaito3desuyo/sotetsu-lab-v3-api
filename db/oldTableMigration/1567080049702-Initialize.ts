import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class Initialize1567080049702 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "times" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "station_id" uuid NOT NULL, "stop_id" uuid NOT NULL, "stop_sequence" integer NOT NULL, "pickup_type" smallint NOT NULL, "dropoff_type" smallint NOT NULL, "arrival_days" integer NOT NULL, "arrival_time" TIME WITH TIME ZONE NOT NULL, "departure_days" integer NOT NULL, "departure_time" TIME WITH TIME ZONE NOT NULL, "depot_in" boolean NOT NULL, "depot_out" boolean NOT NULL, CONSTRAINT "PK_21a9ce7a877cba720e30089638e" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "times"`);
  }
}
