import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignCalendarDatesConstraintNames1791818708445 implements MigrationInterface {
    name = 'AlignCalendarDatesConstraintNames1791818708445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calendar_dates" DROP CONSTRAINT "FK_calendar_dates_calendar_id"`);
        await queryRunner.query(`DROP INDEX "public"."operation_sighting_invalidations_operation_sighting_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_calendar_dates_calendar_id_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_calendar_dates_date"`);
        await queryRunner.query(`CREATE INDEX "IDX_0dff123bd49e89a26abc8a0d1c" ON "calendar_dates" ("date") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_59dc2f22984854c8541088f5c8" ON "calendar_dates" ("calendar_id", "date") `);
        await queryRunner.query(`ALTER TABLE "calendar_dates" ADD CONSTRAINT "FK_364acea51198e23a4d5d0f94c49" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calendar_dates" DROP CONSTRAINT "FK_364acea51198e23a4d5d0f94c49"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59dc2f22984854c8541088f5c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0dff123bd49e89a26abc8a0d1c"`);
        await queryRunner.query(`CREATE INDEX "IDX_calendar_dates_date" ON "calendar_dates" ("date") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_calendar_dates_calendar_id_date" ON "calendar_dates" ("calendar_id", "date") `);
        await queryRunner.query(`CREATE INDEX "operation_sighting_invalidations_operation_sighting_id_idx" ON "operation_sighting_invalidations" ("operation_sighting_id") `);
        await queryRunner.query(`ALTER TABLE "calendar_dates" ADD CONSTRAINT "FK_calendar_dates_calendar_id" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
