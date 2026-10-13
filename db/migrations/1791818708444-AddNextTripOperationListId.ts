import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextTripOperationListId1791818708444 implements MigrationInterface {
    name = 'AddNextTripOperationListId1791818708444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD "next_trip_operation_list_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f124f6dd2acf8c3003191e599" ON "trip_operation_lists" ("next_trip_operation_list_id") `);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "CHK_fcb25b63258ec66faf222d4e34" CHECK ("next_trip_operation_list_id" IS NULL OR "next_trip_operation_list_id" <> "id")`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_2f124f6dd2acf8c3003191e599e" FOREIGN KEY ("next_trip_operation_list_id") REFERENCES "trip_operation_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_2f124f6dd2acf8c3003191e599e"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "CHK_fcb25b63258ec66faf222d4e34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f124f6dd2acf8c3003191e599"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP COLUMN "next_trip_operation_list_id"`);
    }

}
