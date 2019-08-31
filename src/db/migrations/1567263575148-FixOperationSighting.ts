import {MigrationInterface, QueryRunner} from "typeorm";

export class FixOperationSighting1567263575148 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "sighting_time"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "sighting_time" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "sighting_time"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "sighting_time" TIMESTAMP NOT NULL`);
    }

}
