import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTripOperationListIndex1582536766445 implements MigrationInterface {
    name = 'AddTripOperationListIndex1582536766445'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE INDEX "IDX_c9fa678531b742cdab7796a039" ON "trip_operation_lists" ("operation_id") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_6ed9d0378897aa7f2c189f7c10" ON "trip_operation_lists" ("operation_id", "end_time_id") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_1168723e8535df3d5725a7bef9" ON "trip_operation_lists" ("operation_id", "start_time_id") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_1168723e8535df3d5725a7bef9"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_6ed9d0378897aa7f2c189f7c10"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_c9fa678531b742cdab7796a039"`, undefined);
    }

}
