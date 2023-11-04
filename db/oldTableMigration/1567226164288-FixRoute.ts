import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixRoute1567226164288 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP COLUMN "route_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD "route_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "FK_7642ed6f5276084f2e463793c29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "PK_76100511cdfa1d013c859f01d8b"`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "agency_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "route_number"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_number" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_nickname" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP COLUMN "route_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_description" text`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "route_type"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_type" smallint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_color" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_text_color" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "FK_7642ed6f5276084f2e463793c29" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "FK_7642ed6f5276084f2e463793c29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_text_color" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_color" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_url" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "route_type"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_type" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP COLUMN "route_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_description" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "route_nickname" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "route_number"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "route_number" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "agency_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "PK_76100511cdfa1d013c859f01d8b"`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "routes" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "FK_7642ed6f5276084f2e463793c29" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP COLUMN "route_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD "route_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
