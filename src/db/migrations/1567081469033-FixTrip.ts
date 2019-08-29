import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTrip1567081469033 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "UQ_42f23f929fdddf10e05724cf958" UNIQUE ("trip_class_id")`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_42f23f929fdddf10e05724cf958" FOREIGN KEY ("trip_class_id") REFERENCES "trip_classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_42f23f929fdddf10e05724cf958"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "UQ_42f23f929fdddf10e05724cf958"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "created_at"`);
    }

}
