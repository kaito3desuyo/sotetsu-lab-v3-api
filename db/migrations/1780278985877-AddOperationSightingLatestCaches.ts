import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperationSightingLatestCaches1780278985877 implements MigrationInterface {
    name = 'AddOperationSightingLatestCaches1780278985877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "operation_sighting_latest_caches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "formation_number" text NOT NULL, "operation_number" text NOT NULL, "operation_sighting_id" uuid NOT NULL, CONSTRAINT "PK_620bd99dcfe494a3ac379b88cbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_479fc03b3b68af6fba6d7ce3db" ON "operation_sighting_latest_caches" ("operation_sighting_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f0b14463548d307536123c4ed" ON "operation_sighting_latest_caches" ("operation_number") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_90ef4ab942f8d6ecce463e8928" ON "operation_sighting_latest_caches" ("formation_number") `);
        await queryRunner.query(`ALTER TABLE "operation_sighting_latest_caches" ADD CONSTRAINT "FK_479fc03b3b68af6fba6d7ce3dbb" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operation_sighting_latest_caches" DROP CONSTRAINT "FK_479fc03b3b68af6fba6d7ce3dbb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_90ef4ab942f8d6ecce463e8928"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f0b14463548d307536123c4ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_479fc03b3b68af6fba6d7ce3db"`);
        await queryRunner.query(`DROP TABLE "operation_sighting_latest_caches"`);
    }

}
