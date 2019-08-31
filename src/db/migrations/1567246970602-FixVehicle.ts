import {MigrationInterface, QueryRunner} from "typeorm";

export class FixVehicle1567246970602 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "production_date" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "production_date" SET NOT NULL`);
    }

}
