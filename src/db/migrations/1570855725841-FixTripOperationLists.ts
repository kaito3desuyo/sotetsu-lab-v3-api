import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTripOperationLists1570855725841 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_41e910bec03771297cebcffe5e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ALTER COLUMN "start_time_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ALTER COLUMN "end_time_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb" FOREIGN KEY ("start_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_41e910bec03771297cebcffe5e9" FOREIGN KEY ("end_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_41e910bec03771297cebcffe5e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ALTER COLUMN "end_time_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ALTER COLUMN "start_time_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_41e910bec03771297cebcffe5e9" FOREIGN KEY ("end_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb" FOREIGN KEY ("start_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
