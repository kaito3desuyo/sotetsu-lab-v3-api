import {MigrationInterface, QueryRunner} from "typeorm";

export class FixOperationSightingIndex1582533103535 implements MigrationInterface {
    name = 'FixOperationSightingIndex1582533103535'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE INDEX "IDX_446b49c114f72dea3fc43fd1b8" ON "operation_sightings" ("sighting_time") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_4a2cda09801e9a13d9185567ec" ON "operation_sightings" ("formation_id", "sighting_time") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_4a2cda09801e9a13d9185567ec"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_446b49c114f72dea3fc43fd1b8"`, undefined);
    }

}
