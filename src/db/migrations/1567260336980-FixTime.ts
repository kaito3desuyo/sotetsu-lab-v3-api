import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTime1567260336980 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "arrival_days" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "arrival_time" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "departure_days" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "departure_time" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "departure_time" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "departure_days" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "arrival_time" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "times" ALTER COLUMN "arrival_days" SET NOT NULL`);
    }

}
