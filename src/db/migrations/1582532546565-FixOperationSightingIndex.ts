import {MigrationInterface, QueryRunner} from "typeorm";

export class FixOperationSightingIndex1582532546565 implements MigrationInterface {
    name = 'FixOperationSightingIndex1582532546565'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_446b49c114f72dea3fc43fd1b8"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_4f9066d651c084d50c2439d817" ON "operation_sightings" ("operation_id", "sighting_time") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_4f9066d651c084d50c2439d817"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_446b49c114f72dea3fc43fd1b8" ON "operation_sightings" ("sighting_time") `, undefined);
    }

}
