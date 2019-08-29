import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTripClass1567081653226 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "created_at"`);
    }

}
