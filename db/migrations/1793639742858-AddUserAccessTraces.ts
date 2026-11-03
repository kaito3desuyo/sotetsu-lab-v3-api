import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAccessTraces1793639742858 implements MigrationInterface {
    name = 'AddUserAccessTraces1793639742858'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_access_traces" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "kind" text NOT NULL, "ip" inet NOT NULL, "user_agent" text, "session_id" uuid, "operation_sighting_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_99ee8854335ba473821302b55c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9d9bf5e3bb98c5dc5b6e0efa8e" ON "user_access_traces"  ("session_id", "ip") `);
        await queryRunner.query(`CREATE INDEX "IDX_58ce72f3951082d4b19508ba66" ON "user_access_traces"  ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_dc9b519af392bc451828d43c7a" ON "user_access_traces"  ("ip") `);
        await queryRunner.query(`CREATE INDEX "IDX_26c84ec3bc89be47d031ef51c0" ON "user_access_traces"  ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "user_access_traces" ADD CONSTRAINT "FK_c4a912e103f5eef65bda3252795" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_access_traces" ADD CONSTRAINT "FK_1eec70e01d9b64a1ce24504daac" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_access_traces" DROP CONSTRAINT "FK_1eec70e01d9b64a1ce24504daac"`);
        await queryRunner.query(`ALTER TABLE "user_access_traces" DROP CONSTRAINT "FK_c4a912e103f5eef65bda3252795"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26c84ec3bc89be47d031ef51c0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc9b519af392bc451828d43c7a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_58ce72f3951082d4b19508ba66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d9bf5e3bb98c5dc5b6e0efa8e"`);
        await queryRunner.query(`DROP TABLE "user_access_traces"`);
    }

}
