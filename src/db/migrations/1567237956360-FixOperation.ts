import {MigrationInterface, QueryRunner} from "typeorm";

export class FixOperation1567237956360 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "operation_id"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "operation_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operations" DROP CONSTRAINT "PK_7b62d84d6f9912b975987165856"`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "operations" ADD CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1"`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operations" DROP CONSTRAINT "PK_7b62d84d6f9912b975987165856"`);
        await queryRunner.query(`ALTER TABLE "operations" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "operations" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operations" ADD CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "operation_id"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "operation_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
