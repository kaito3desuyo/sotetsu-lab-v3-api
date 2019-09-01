import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixRouteToStation1567231552799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "station_numbering" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ALTER COLUMN "station_numbering" SET NOT NULL`,
    );
  }
}
