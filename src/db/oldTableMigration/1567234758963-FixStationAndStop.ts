import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixStationAndStop1567234758963 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "stops" ADD CONSTRAINT "FK_0a94033fa3e23aaf0f7700eeb05" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "stops" DROP CONSTRAINT "FK_0a94033fa3e23aaf0f7700eeb05"`,
    );
  }
}
