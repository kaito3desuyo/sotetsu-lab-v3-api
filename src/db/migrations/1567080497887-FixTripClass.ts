import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTripClass1567080497887 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "trip_class_name"`);
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "trip_class_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "trip_class_color"`);
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "trip_class_color" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "trip_class_color"`);
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "trip_class_color" character NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trip_classes" DROP COLUMN "trip_class_name"`);
        await queryRunner.query(`ALTER TABLE "trip_classes" ADD "trip_class_name" character NOT NULL`);
    }

}
