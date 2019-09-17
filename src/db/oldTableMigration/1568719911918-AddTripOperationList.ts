import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripOperationList1568719911918 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT "FK_351b39dbca2fae05cb18444bc0e"`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_operation_lists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "start_time_id" uuid NOT NULL, "end_time_id" uuid NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5b8f8ded7f190e6405d4f9e732c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_c9fa678531b742cdab7796a0393" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_c9fa678531b742cdab7796a0393"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc"`,
    );
    await queryRunner.query(`DROP TABLE "trip_operation_lists"`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_351b39dbca2fae05cb18444bc0e" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
