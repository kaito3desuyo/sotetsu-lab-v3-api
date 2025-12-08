import { MigrationInterface, QueryRunner } from "typeorm";

export class FixOperationSightingForeignKey1762601838219 implements MigrationInterface {
    name = 'FixOperationSightingForeignKey1762601838219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" DROP CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" DROP CONSTRAINT "REL_191870b31bbc8d2ed609eb1f15"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" ADD CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" DROP CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" ADD CONSTRAINT "REL_191870b31bbc8d2ed609eb1f15" UNIQUE ("operation_sighting_id")`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" ADD CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
