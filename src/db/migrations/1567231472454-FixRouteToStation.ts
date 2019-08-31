import {MigrationInterface, QueryRunner} from "typeorm";

export class FixRouteToStation1567231472454 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ALTER COLUMN "route_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ALTER COLUMN "station_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "station_sequence"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "station_sequence" smallint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "station_sequence"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "station_sequence" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ALTER COLUMN "station_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ALTER COLUMN "route_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
