import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTime1567264708712 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "created_at"`);
  }
}
