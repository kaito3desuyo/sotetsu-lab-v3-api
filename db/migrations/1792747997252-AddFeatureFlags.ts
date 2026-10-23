import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeatureFlags1792747997252 implements MigrationInterface {
    name = 'AddFeatureFlags1792747997252'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "feature_flags" ("key" text NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_36d0344370584b4d6a953c53a69" PRIMARY KEY ("key"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "feature_flags"`);
    }

}
