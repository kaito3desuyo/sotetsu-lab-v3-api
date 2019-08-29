import {MigrationInterface, QueryRunner} from "typeorm";

export class Initialize1567080371549 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "trip_classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "trip_class_name" character NOT NULL, "trip_class_color" character NOT NULL, "sequence" smallint NOT NULL, CONSTRAINT "PK_4eff511b2ab0b3dfbfe61de616d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "trip_classes"`);
    }

}
