import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTripOperationLists1570861433899 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD "start_station_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD "end_station_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_4286fd47f0fdda800d09291143b" FOREIGN KEY ("start_station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_9dcef4c6deac388e0b9297d1e6d" FOREIGN KEY ("end_station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_9dcef4c6deac388e0b9297d1e6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_4286fd47f0fdda800d09291143b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP COLUMN "end_station_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP COLUMN "start_station_id"`,
    );
  }
}
