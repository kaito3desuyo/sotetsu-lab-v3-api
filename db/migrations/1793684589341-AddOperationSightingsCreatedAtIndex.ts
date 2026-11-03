import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperationSightingsCreatedAtIndex1793684589341 implements MigrationInterface {
    name = 'AddOperationSightingsCreatedAtIndex1793684589341'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_c6f0515d62de4d61b6b00fd28e" ON "operation_sightings"  ("created_at", "id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c6f0515d62de4d61b6b00fd28e"`);
    }

}
