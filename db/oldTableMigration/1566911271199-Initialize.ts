import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class Initialize1566911271199 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "stations" ("id" SERIAL NOT NULL, "station_name" character varying NOT NULL, "station_subname" character varying NOT NULL, "station_type" integer NOT NULL, "station_description" character varying NOT NULL, "station_latlng" geometry(Point,4326) NOT NULL, "station_url" character varying NOT NULL, "wheelchair_boarding" boolean NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f047974bd453c85b08bab349367" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_station_lists" ("id" SERIAL NOT NULL, "station_sequence" integer NOT NULL, "station_numbering" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "route_id" integer, "station_id" integer, CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "routes" ("id" SERIAL NOT NULL, "route_number" integer NOT NULL, "route_name" character varying NOT NULL, "route_nickname" character varying NOT NULL, "route_description" character varying NOT NULL, "route_type" integer NOT NULL, "route_url" character varying NOT NULL, "route_color" character varying NOT NULL, "route_text_color" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "agency_id" integer, CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agencies" ("id" SERIAL NOT NULL, "agency_number" character varying NOT NULL, "parent_agency_number" character varying NOT NULL, "agency_official_name" character varying NOT NULL, "agency_name" character varying NOT NULL, "agency_type" integer NOT NULL, "agency_url" character varying NOT NULL, "agency_phone" character varying NOT NULL, "agency_fare_url" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" SERIAL NOT NULL, "vehicle_number" character varying NOT NULL, "belongs" character varying NOT NULL, "production_date" date NOT NULL, "scrapped_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_formations" ("id" SERIAL NOT NULL, "formation_id" integer NOT NULL, "vehicle_id" integer NOT NULL, "car_number" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_646538c1681430517abb70916b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "formations" ("id" SERIAL NOT NULL, "agency_id" character varying NOT NULL, "vehicle_type" character varying NOT NULL, "formation_number" character varying NOT NULL, "formation_description" character varying NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e071aaba3322392364953ba5c95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operation_sightings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "formation_id" integer NOT NULL, "operation_id" integer NOT NULL, "sighting_time" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_adb9904d9ab5500d5eb529857b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operations" ("id" SERIAL NOT NULL, "calender_id" integer NOT NULL, "operation_number" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "calenders" ("id" SERIAL NOT NULL, "calender_name" character varying NOT NULL, "sunday" boolean NOT NULL, "monday" boolean NOT NULL, "tuesday" boolean NOT NULL, "wednesday" boolean NOT NULL, "thursday" boolean NOT NULL, "friday" boolean NOT NULL, "saturday" boolean NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5982bfd67e80c36271e647be082" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "FK_7642ed6f5276084f2e463793c29" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operations" ADD CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2" FOREIGN KEY ("calender_id") REFERENCES "calenders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operations" DROP CONSTRAINT "FK_85e2213c49a3e4eb013024c53b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_50f6d7f75fd0507144a9e9d30b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "FK_7642ed6f5276084f2e463793c29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`,
    );
    await queryRunner.query(`DROP TABLE "calenders"`);
    await queryRunner.query(`DROP TABLE "operations"`);
    await queryRunner.query(`DROP TABLE "operation_sightings"`);
    await queryRunner.query(`DROP TABLE "formations"`);
    await queryRunner.query(`DROP TABLE "vehicle_formations"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "agencies"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TABLE "route_station_lists"`);
    await queryRunner.query(`DROP TABLE "stations"`);
  }
}
