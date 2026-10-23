import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperationSightingAuthors1792739673780 implements MigrationInterface {
    name = 'AddOperationSightingAuthors1792739673780'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "operation_sighting_authors" ("operation_sighting_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b1a690c6eafc6c2a91572dbe5cd" PRIMARY KEY ("operation_sighting_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_700ca5e4bb758b294d10d1a478" ON "operation_sighting_authors"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "operation_sighting_management_logs" ADD CONSTRAINT "FK_d6d6e15c27d5e439d3d52276607" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_authors" ADD CONSTRAINT "FK_b1a690c6eafc6c2a91572dbe5cd" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_authors" ADD CONSTRAINT "FK_700ca5e4bb758b294d10d1a4780" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operation_sighting_authors" DROP CONSTRAINT "FK_700ca5e4bb758b294d10d1a4780"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_authors" DROP CONSTRAINT "FK_b1a690c6eafc6c2a91572dbe5cd"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_management_logs" DROP CONSTRAINT "FK_d6d6e15c27d5e439d3d52276607"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_700ca5e4bb758b294d10d1a478"`);
        await queryRunner.query(`DROP TABLE "operation_sighting_authors"`);
    }

}
