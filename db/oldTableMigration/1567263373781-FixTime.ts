import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTime1567263373781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "depot_in"`);
    await queryRunner.query(`ALTER TABLE "times" DROP COLUMN "depot_out"`);
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_0208c8a537a53bb1380d411140c" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "times" DROP CONSTRAINT "FK_0208c8a537a53bb1380d411140c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD "depot_out" boolean NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD "depot_in" boolean NOT NULL`,
    );
  }
}
