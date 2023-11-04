import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOperationSightings1568203712588 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP(3) WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "updated_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "created_at" TYPE TIMESTAMP(6) WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP(6) WITH TIME ZONE`,
    );
  }
}
