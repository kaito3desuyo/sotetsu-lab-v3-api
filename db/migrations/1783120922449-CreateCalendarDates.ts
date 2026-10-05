import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCalendarDates1783120922449 implements MigrationInterface {
    name = 'CreateCalendarDates1783120922449'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "calendar_dates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "calendar_id" uuid NOT NULL, "date" date NOT NULL, "exception_type" smallint NOT NULL, "memo" character varying, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), CONSTRAINT "PK_calendar_dates_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_calendar_dates_calendar_id_date" ON "calendar_dates" ("calendar_id", "date")`);
        await queryRunner.query(`CREATE INDEX "IDX_calendar_dates_date" ON "calendar_dates" ("date")`);
        await queryRunner.query(`ALTER TABLE "calendar_dates" ADD CONSTRAINT "FK_calendar_dates_calendar_id" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calendar_dates" DROP CONSTRAINT "FK_calendar_dates_calendar_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_calendar_dates_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_calendar_dates_calendar_id_date"`);
        await queryRunner.query(`DROP TABLE "calendar_dates"`);
    }

}
