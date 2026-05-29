import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexes1780068845273 implements MigrationInterface {
    name = 'AddIndexes1780068845273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_191870b31bbc8d2ed609eb1f15" ON "operation_sighting_invalidations" ("operation_sighting_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_53eb491fdb237ee37237227fcb" ON "operation_sighting_management_logs" ("operation_sighting_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_50f6d7f75fd0507144a9e9d30b" ON "operation_sightings" ("operation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8c6951686b6a2d4b3dd83e1d44" ON "operation_sightings" ("formation_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8c6951686b6a2d4b3dd83e1d44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50f6d7f75fd0507144a9e9d30b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53eb491fdb237ee37237227fcb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_191870b31bbc8d2ed609eb1f15"`);
    }

}
