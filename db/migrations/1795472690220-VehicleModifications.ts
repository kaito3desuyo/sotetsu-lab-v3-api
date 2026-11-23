import { MigrationInterface, QueryRunner } from "typeorm";

export class VehicleModifications1795472690220 implements MigrationInterface {
    name = 'VehicleModifications1795472690220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vehicle_modifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicle_id" uuid NOT NULL, "modified_on" date, "kind" character varying NOT NULL, "value" character varying, "description" text, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b1ff8a859f8cf1097665b0b83bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8d5c9ac96d0f22b17247215c6e" ON "vehicle_modifications"  ("vehicle_id") `);
        await queryRunner.query(`ALTER TABLE "vehicle_modifications" ADD CONSTRAINT "FK_8d5c9ac96d0f22b17247215c6eb" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vehicle_modifications" DROP CONSTRAINT "FK_8d5c9ac96d0f22b17247215c6eb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d5c9ac96d0f22b17247215c6e"`);
        await queryRunner.query(`DROP TABLE "vehicle_modifications"`);
    }

}
