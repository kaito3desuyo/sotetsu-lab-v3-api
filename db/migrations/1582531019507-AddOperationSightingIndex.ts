import {MigrationInterface, QueryRunner} from "typeorm";

export class AddOperationSightingIndex1582531019507 implements MigrationInterface {
    name = 'AddOperationSightingIndex1582531019507'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP(3) WITH TIME ZONE`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_446b49c114f72dea3fc43fd1b8" ON "operation_sightings" ("sighting_time") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_446b49c114f72dea3fc43fd1b8"`, undefined);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ALTER COLUMN "sighting_time" TYPE TIMESTAMP(6) WITH TIME ZONE`, undefined);
    }

}
