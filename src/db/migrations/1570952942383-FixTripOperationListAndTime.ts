import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTripOperationListAndTime1570952942383
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
