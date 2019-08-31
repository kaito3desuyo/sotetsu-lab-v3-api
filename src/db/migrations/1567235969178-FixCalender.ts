import {MigrationInterface, QueryRunner} from "typeorm";

export class FixCalender1567235969178 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "calenders" ADD "service_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operations" DROP CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2"`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "calender_id"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "calender_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP CONSTRAINT "PK_5982bfd67e80c36271e647be082"`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD CONSTRAINT "PK_5982bfd67e80c36271e647be082" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operations" ADD CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2" FOREIGN KEY ("calender_id") REFERENCES "calenders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operations" DROP CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2"`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP CONSTRAINT "PK_5982bfd67e80c36271e647be082"`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "calenders" ADD CONSTRAINT "PK_5982bfd67e80c36271e647be082" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "calender_id"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "calender_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operations" ADD CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2" FOREIGN KEY ("calender_id") REFERENCES "calenders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calenders" DROP COLUMN "service_id"`);
    }

}
