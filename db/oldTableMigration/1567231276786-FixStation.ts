import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixStation1567231276786 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP CONSTRAINT "PK_f047974bd453c85b08bab349367"`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ADD CONSTRAINT "PK_f047974bd453c85b08bab349367" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_subname" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP COLUMN "station_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "station_type" smallint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP COLUMN "station_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "station_description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_latlng" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_url" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP COLUMN "station_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD "station_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP COLUMN "station_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD "station_id" integer`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_latlng" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP COLUMN "station_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "station_description" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP COLUMN "station_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ADD "station_type" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" ALTER COLUMN "station_subname" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stations" DROP CONSTRAINT "PK_f047974bd453c85b08bab349367"`,
    );
    await queryRunner.query(`ALTER TABLE "stations" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "stations" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "stations" ADD CONSTRAINT "PK_f047974bd453c85b08bab349367" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
