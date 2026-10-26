import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTripCalendarForeignKeys1793001570208 implements MigrationInterface {
    name = 'AddTripCalendarForeignKeys1793001570208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_2713f5b9004534c567a9ee40f8f" FOREIGN KEY ("calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_e883b98f2de67fdfe608541ae2a" FOREIGN KEY ("extra_calendar_id") REFERENCES "calendars"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_e883b98f2de67fdfe608541ae2a"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_2713f5b9004534c567a9ee40f8f"`);
    }

}
