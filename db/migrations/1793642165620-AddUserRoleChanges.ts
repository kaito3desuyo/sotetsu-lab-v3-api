import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleChanges1793642165620 implements MigrationInterface {
    name = 'AddUserRoleChanges1793642165620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_role_changes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "changed_by" uuid NOT NULL, "from_role" text NOT NULL, "to_role" text NOT NULL, "reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f1eea0459d29c9c99b272f2742" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_63bc9881c8460e86b890a212c5" ON "user_role_changes"  ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "user_role_changes" ADD CONSTRAINT "FK_bc272bd5b25355441dad8f853df" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_role_changes" ADD CONSTRAINT "FK_823399b1d4e8e7c3cbaf0148588" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_role_changes" DROP CONSTRAINT "FK_823399b1d4e8e7c3cbaf0148588"`);
        await queryRunner.query(`ALTER TABLE "user_role_changes" DROP CONSTRAINT "FK_bc272bd5b25355441dad8f853df"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63bc9881c8460e86b890a212c5"`);
        await queryRunner.query(`DROP TABLE "user_role_changes"`);
    }

}
