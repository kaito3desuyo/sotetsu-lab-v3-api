import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTime1567263883200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "arrival_time"`);
    await queryRunner.query(`ALTER TABLE "times" ADD "arrival_time" TIME`);
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "departure_time"`);
    await queryRunner.query(`ALTER TABLE "times" ADD "departure_time" TIME`);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "departure_time"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "departure_time" TIME WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "arrival_time"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD "arrival_time" TIME WITH TIME ZONE`,
    );
  }
}
