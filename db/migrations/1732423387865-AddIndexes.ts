import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1732423387865 implements MigrationInterface {
    name = 'AddIndexes1732423387865';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "IDX_7896e8b6b9950984372a3805f7" ON "trips" ("trip_block_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3049d603006b02c29aae8d2e29" ON "operation_sightings" ("sighting_time" DESC, "updated_at" DESC, "id" ASC) `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_879c2fa6284e7118a501ed9eaf" ON "times" ("trip_id") `,
        );
        await queryRunner.query(
            `ALTER TABLE "calendars" ADD CONSTRAINT "FK_54cf70bc8959ffc5756c52d86ea" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "calendars" DROP CONSTRAINT "FK_54cf70bc8959ffc5756c52d86ea"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_879c2fa6284e7118a501ed9eaf"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_3049d603006b02c29aae8d2e29"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_7896e8b6b9950984372a3805f7"`,
        );
    }
}
