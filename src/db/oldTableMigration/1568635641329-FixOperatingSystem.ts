import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOperatingSystem1568635641329 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD "start_route_station_list_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "UQ_478993f9ec628c8eb5ed1afc9e1" UNIQUE ("start_route_station_list_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD "end_route_station_list_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "UQ_04c341f2929c40946d9c317d93c" UNIQUE ("end_route_station_list_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_478993f9ec628c8eb5ed1afc9e1" FOREIGN KEY ("start_route_station_list_id") REFERENCES "route_station_lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_04c341f2929c40946d9c317d93c" FOREIGN KEY ("end_route_station_list_id") REFERENCES "route_station_lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_04c341f2929c40946d9c317d93c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_478993f9ec628c8eb5ed1afc9e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "UQ_04c341f2929c40946d9c317d93c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP COLUMN "end_route_station_list_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "UQ_478993f9ec628c8eb5ed1afc9e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP COLUMN "start_route_station_list_id"`,
    );
  }
}
