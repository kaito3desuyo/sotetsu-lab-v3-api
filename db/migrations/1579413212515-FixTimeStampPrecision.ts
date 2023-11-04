import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTimeStampPrecision1579413212515 implements MigrationInterface {
  name = 'FixTimeStampPrecision1579413212515';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "stops" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stops" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "formations" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "formations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_blocks" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_blocks" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_blocks" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_blocks" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "formations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "formations" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stops" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "stops" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
      undefined,
    );
  }
}
