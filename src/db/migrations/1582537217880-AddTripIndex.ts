import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTripIndex1582537217880 implements MigrationInterface {
    name = 'AddTripIndex1582537217880'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE INDEX "IDX_bb1eec82b80460e7a5e96441fb" ON "trips" ("calendar_id", "trip_direction") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_bb1eec82b80460e7a5e96441fb"`, undefined);
    }

}
