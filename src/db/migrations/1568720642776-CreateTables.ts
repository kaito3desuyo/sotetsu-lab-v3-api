import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1568720642776 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "station_id" uuid NOT NULL, "stop_name" character varying NOT NULL, "stop_description" text, "stop_latlng" geometry(Point,4326), "zone_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed1be877403ad3c921b07f62ca5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_station_lists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "route_id" uuid NOT NULL, "station_id" uuid NOT NULL, "station_sequence" smallint NOT NULL, "station_numbering" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2613fe4e15e0929ebc06c9a96ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "station_name" character varying NOT NULL, "station_subname" character varying, "station_type" smallint NOT NULL, "station_description" text, "station_latlng" geometry(Point,4326), "station_url" character varying, "wheelchair_boarding" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f047974bd453c85b08bab349367" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "calenders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "calender_name" character varying NOT NULL, "sunday" boolean NOT NULL, "monday" boolean NOT NULL, "tuesday" boolean NOT NULL, "wednesday" boolean NOT NULL, "thursday" boolean NOT NULL, "friday" boolean NOT NULL, "saturday" boolean NOT NULL, "start_date" date NOT NULL, "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5982bfd67e80c36271e647be082" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicle_number" character varying NOT NULL, "belongs" character varying NOT NULL, "production_date" date, "scrapped_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97a57b7389989efc352bef8af3a" UNIQUE ("vehicle_number"), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_formations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "formation_id" uuid NOT NULL, "vehicle_id" uuid NOT NULL, "car_number" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_646538c1681430517abb70916b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "formations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agency_id" uuid NOT NULL, "vehicle_type" character varying NOT NULL, "formation_number" character varying NOT NULL, "formation_description" text, "start_date" date, "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e071aaba3322392364953ba5c95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operation_sightings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "formation_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "sighting_time" TIMESTAMP(3) WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_adb9904d9ab5500d5eb529857b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "calender_id" uuid NOT NULL, "operation_number" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7b62d84d6f9912b975987165856" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_operation_lists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "start_time_id" uuid NOT NULL, "end_time_id" uuid NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5b8f8ded7f190e6405d4f9e732c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "times" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "station_id" uuid NOT NULL, "stop_id" uuid NOT NULL, "stop_sequence" integer NOT NULL, "pickup_type" smallint NOT NULL, "dropoff_type" smallint NOT NULL, "arrival_days" smallint, "arrival_time" TIME, "departure_days" smallint, "departure_time" TIME, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_21a9ce7a877cba720e30089638e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3b72e3959ee5b124be1452acb61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "trip_number" character varying NOT NULL, "trip_class_id" uuid NOT NULL, "trip_name" character varying, "trip_direction" smallint NOT NULL, "trip_block_id" uuid NOT NULL, "depot_in" boolean NOT NULL, "depot_out" boolean NOT NULL, "calender_id" uuid, "extra_calender_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "trip_class_name" character varying NOT NULL, "trip_class_color" character varying NOT NULL, "sequence" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4eff511b2ab0b3dfbfe61de616d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_name" character varying NOT NULL, "service_description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operating_systems" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "route_id" uuid NOT NULL, "start_route_station_list_id" uuid NOT NULL, "end_route_station_list_id" uuid NOT NULL, "sequence" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bbc32484423a308be83d8cc2e8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "routes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agency_id" uuid NOT NULL, "route_number" character varying, "route_name" character varying NOT NULL, "route_nickname" character varying, "route_description" text, "route_type" smallint NOT NULL, "route_url" character varying, "route_color" character varying, "route_text_color" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agency_number" character varying NOT NULL, "parent_agency_number" character varying, "agency_official_name" character varying NOT NULL, "agency_name" character varying, "agency_type" smallint NOT NULL, "agency_url" character varying, "agency_phone" character varying, "agency_fare_url" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "stops" ADD CONSTRAINT "FK_0a94033fa3e23aaf0f7700eeb05" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_4b64971cca105b6738c9faf6198" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" ADD CONSTRAINT "FK_799c790d3094b52346aff68ab4e" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "formations" ADD CONSTRAINT "FK_dfeba01a5bd41817c3f0e51dee2" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_c9fa678531b742cdab7796a0393" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb" FOREIGN KEY ("start_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_41e910bec03771297cebcffe5e9" FOREIGN KEY ("end_time_id") REFERENCES "times"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_0208c8a537a53bb1380d411140c" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_87c3207234df1cae634490f0d49" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" ADD CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_50697e60adb4e1ded1237376645" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_42f23f929fdddf10e05724cf958" FOREIGN KEY ("trip_class_id") REFERENCES "trip_classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_7896e8b6b9950984372a3805f78" FOREIGN KEY ("trip_block_id") REFERENCES "trip_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" ADD CONSTRAINT "FK_93ecedbe5e4d7b5b09799cd2d92" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_52e16952d65ab52eb2523492d30" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_688ebe76aa58bb58d493241b0b9" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_478993f9ec628c8eb5ed1afc9e1" FOREIGN KEY ("start_route_station_list_id") REFERENCES "route_station_lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_04c341f2929c40946d9c317d93c" FOREIGN KEY ("end_route_station_list_id") REFERENCES "route_station_lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_04c341f2929c40946d9c317d93c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_478993f9ec628c8eb5ed1afc9e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_688ebe76aa58bb58d493241b0b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_52e16952d65ab52eb2523492d30"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_classes" DROP CONSTRAINT "FK_93ecedbe5e4d7b5b09799cd2d92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT "FK_7896e8b6b9950984372a3805f78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT "FK_42f23f929fdddf10e05724cf958"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT "FK_50697e60adb4e1ded1237376645"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_879c2fa6284e7118a501ed9eaf0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_87c3207234df1cae634490f0d49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "times" DROP CONSTRAINT "FK_0208c8a537a53bb1380d411140c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_41e910bec03771297cebcffe5e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_a44f2dc0a8a82aebd3c71238acb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_c9fa678531b742cdab7796a0393"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_7811b6af1aa77ad8926a29f4cfc"`,
    );
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
      `ALTER TABLE "formations" DROP CONSTRAINT "FK_dfeba01a5bd41817c3f0e51dee2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_799c790d3094b52346aff68ab4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_station_lists" DROP CONSTRAINT "FK_4b64971cca105b6738c9faf6198"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stops" DROP CONSTRAINT "FK_0a94033fa3e23aaf0f7700eeb05"`,
    );
    await queryRunner.query(`DROP TABLE "agencies"`);
    await queryRunner.query(`DROP TABLE "routes"`);
    await queryRunner.query(`DROP TABLE "operating_systems"`);
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(`DROP TABLE "trip_classes"`);
    await queryRunner.query(`DROP TABLE "trips"`);
    await queryRunner.query(`DROP TABLE "trip_blocks"`);
    await queryRunner.query(`DROP TABLE "times"`);
    await queryRunner.query(`DROP TABLE "trip_operation_lists"`);
    await queryRunner.query(`DROP TABLE "operations"`);
    await queryRunner.query(`DROP TABLE "operation_sightings"`);
    await queryRunner.query(`DROP TABLE "formations"`);
    await queryRunner.query(`DROP TABLE "vehicle_formations"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "calenders"`);
    await queryRunner.query(`DROP TABLE "stations"`);
    await queryRunner.query(`DROP TABLE "route_station_lists"`);
    await queryRunner.query(`DROP TABLE "stops"`);
  }
}
