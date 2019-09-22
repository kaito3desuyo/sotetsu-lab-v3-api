import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNameCalendars1569128713881 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" RENAME COLUMN "calender_id" TO "calendar_id"`,
    );
    await queryRunner.query(
      `CREATE TABLE "calendars" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "calendar_name" character varying NOT NULL, "sunday" boolean NOT NULL, "monday" boolean NOT NULL, "tuesday" boolean NOT NULL, "wednesday" boolean NOT NULL, "thursday" boolean NOT NULL, "friday" boolean NOT NULL, "saturday" boolean NOT NULL, "start_date" date NOT NULL, "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_90dc0330e8ec9028e23c290dee8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "calender_id"`);
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "extra_calender_id"`,
    );
    await queryRunner.query(`ALTER TABLE "trips" ADD "calendar_id" uuid`);
    await queryRunner.query(`ALTER TABLE "trips" ADD "extra_calendar_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_5c0fdb93db21cbe1a0a0e49059e" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_5c0fdb93db21cbe1a0a0e49059e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "extra_calendar_id"`,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "calendar_id"`);
    await queryRunner.query(`ALTER TABLE "trips" ADD "extra_calender_id" uuid`);
    await queryRunner.query(`ALTER TABLE "trips" ADD "calender_id" uuid`);
    await queryRunner.query(`DROP TABLE "calendars"`);
    await queryRunner.query(
      `ALTER TABLE "operations" RENAME COLUMN "calendar_id" TO "calender_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2" FOREIGN KEY ("calender_id") REFERENCES "calenders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
