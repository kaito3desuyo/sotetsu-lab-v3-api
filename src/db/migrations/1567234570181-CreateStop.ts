import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateStop1567234570181 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "station_id" uuid NOT NULL, "stop_name" character varying NOT NULL, "stop_description" text, "stop_latlng" geometry(Point,4326), "zone_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed1be877403ad3c921b07f62ca5" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "stops"`);
    }

}
