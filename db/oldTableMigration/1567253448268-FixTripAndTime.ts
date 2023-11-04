import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixTripAndTime1567253448268 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0"`,
    );
  }
}
