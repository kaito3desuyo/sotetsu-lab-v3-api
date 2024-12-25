import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1734614550081 implements MigrationInterface {
    name = 'AddIndexes1734614550081';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE INDEX "IDX_0a94033fa3e23aaf0f7700eeb0" ON "stops" ("station_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_50697e60adb4e1ded123737664" ON "trips" ("service_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_42f23f929fdddf10e05724cf95" ON "trips" ("trip_class_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_2713f5b9004534c567a9ee40f8" ON "trips" ("calendar_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e883b98f2de67fdfe608541ae2" ON "trips" ("extra_calendar_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_93ecedbe5e4d7b5b09799cd2d9" ON "trip_classes" ("service_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_54cf70bc8959ffc5756c52d86e" ON "calendars" ("service_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d915d67bb553da7834db11a5a0" ON "operations" ("operation_number") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7811b6af1aa77ad8926a29f4cf" ON "trip_operation_lists" ("trip_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_4286fd47f0fdda800d09291143" ON "trip_operation_lists" ("start_station_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_9dcef4c6deac388e0b9297d1e6" ON "trip_operation_lists" ("end_station_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a44f2dc0a8a82aebd3c71238ac" ON "trip_operation_lists" ("start_time_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_41e910bec03771297cebcffe5e" ON "trip_operation_lists" ("end_time_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_0208c8a537a53bb1380d411140" ON "times" ("station_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_87c3207234df1cae634490f0d4" ON "times" ("stop_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_4b64971cca105b6738c9faf619" ON "route_station_lists" ("route_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_799c790d3094b52346aff68ab4" ON "route_station_lists" ("station_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_52e16952d65ab52eb2523492d3" ON "operating_systems" ("service_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_688ebe76aa58bb58d493241b0b" ON "operating_systems" ("route_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_478993f9ec628c8eb5ed1afc9e" ON "operating_systems" ("start_route_station_list_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_04c341f2929c40946d9c317d93" ON "operating_systems" ("end_route_station_list_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7642ed6f5276084f2e463793c2" ON "routes" ("agency_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_dfeba01a5bd41817c3f0e51dee" ON "formations" ("agency_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5e8f2876959f3ac36ad42628cd" ON "formations" ("formation_number") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_bdcb5fc63380379e24bba77e44" ON "vehicle_formations" ("formation_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7fba0290b9cb01725b6b020ea7" ON "vehicle_formations" ("vehicle_id") `,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX "public"."IDX_7fba0290b9cb01725b6b020ea7"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_bdcb5fc63380379e24bba77e44"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_5e8f2876959f3ac36ad42628cd"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_dfeba01a5bd41817c3f0e51dee"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_7642ed6f5276084f2e463793c2"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_04c341f2929c40946d9c317d93"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_478993f9ec628c8eb5ed1afc9e"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_688ebe76aa58bb58d493241b0b"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_52e16952d65ab52eb2523492d3"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_799c790d3094b52346aff68ab4"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_4b64971cca105b6738c9faf619"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_87c3207234df1cae634490f0d4"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_0208c8a537a53bb1380d411140"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_41e910bec03771297cebcffe5e"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_a44f2dc0a8a82aebd3c71238ac"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_9dcef4c6deac388e0b9297d1e6"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_4286fd47f0fdda800d09291143"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_7811b6af1aa77ad8926a29f4cf"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_d915d67bb553da7834db11a5a0"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_54cf70bc8959ffc5756c52d86e"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_93ecedbe5e4d7b5b09799cd2d9"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_e883b98f2de67fdfe608541ae2"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_2713f5b9004534c567a9ee40f8"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_42f23f929fdddf10e05724cf95"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_50697e60adb4e1ded123737664"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_0a94033fa3e23aaf0f7700eeb0"`,
        );
    }
}
