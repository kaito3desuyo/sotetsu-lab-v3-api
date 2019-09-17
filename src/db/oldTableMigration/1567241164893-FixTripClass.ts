import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTripClass1567241164893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ADD CONSTRAINT "FK_93ecedbe5e4d7b5b09799cd2d92" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_classes" DROP CONSTRAINT "FK_93ecedbe5e4d7b5b09799cd2d92"`,
    );
  }
}
