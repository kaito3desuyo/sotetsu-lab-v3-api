import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTripOperationListCheckForTypeorm11792549038033 implements MigrationInterface {
    name = 'RenameTripOperationListCheckForTypeorm11792549038033'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "CHK_fcb25b63258ec66faf222d4e34"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "CHK_75647087b6d0d33b4beff33f0d" CHECK ("next_trip_operation_list_id" IS NULL OR "next_trip_operation_list_id" <> "id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "CHK_75647087b6d0d33b4beff33f0d"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "CHK_fcb25b63258ec66faf222d4e34" CHECK (((next_trip_operation_list_id IS NULL) OR (next_trip_operation_list_id <> id)))`);
    }

}
