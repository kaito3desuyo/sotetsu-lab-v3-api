import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class Initialize1567079743637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "trips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "trip_number" character varying NOT NULL, "trip_class_id" uuid NOT NULL, "trip_name" character varying NOT NULL, "trip_direction" smallint NOT NULL, "trip_block_id" uuid NOT NULL, "calender_id" uuid NOT NULL, "extra_calender_id" uuid NOT NULL, CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "trips"`);
  }
}
