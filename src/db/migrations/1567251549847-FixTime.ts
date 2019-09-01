import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTime1567251549847 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "arrival_days"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "arrival_days" smallint NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "departure_days"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "departure_days" smallint NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "departure_days"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "departure_days" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "arrival_days"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "arrival_days" integer NOT NULL`,
    );
  }
}
