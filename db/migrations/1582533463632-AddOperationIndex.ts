import {MigrationInterface, QueryRunner} from "typeorm";

export class AddOperationIndex1582533463632 implements MigrationInterface {
    name = 'AddOperationIndex1582533463632'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE INDEX "IDX_5c0fdb93db21cbe1a0a0e49059" ON "operations" ("calendar_id") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_5c0fdb93db21cbe1a0a0e49059"`, undefined);
    }

}
