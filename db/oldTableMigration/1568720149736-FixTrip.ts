import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTrip1568720149736 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "operation_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "operation_id" uuid NOT NULL`,
    );
  }
}
