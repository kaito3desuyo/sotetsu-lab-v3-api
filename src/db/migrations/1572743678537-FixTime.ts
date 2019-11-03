import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTime1572743678537 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_87c3207234df1cae634490f0d49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "stop_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_87c3207234df1cae634490f0d49" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_87c3207234df1cae634490f0d49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ALTER COLUMN "stop_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_87c3207234df1cae634490f0d49" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
