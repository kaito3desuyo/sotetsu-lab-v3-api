import {MigrationInterface, QueryRunner} from "typeorm";

export class FixCalender1567237599869 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "calenders" ALTER COLUMN "end_date" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "calenders" ALTER COLUMN "end_date" SET NOT NULL`);
    }

}
