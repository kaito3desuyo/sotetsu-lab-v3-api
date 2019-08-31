import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTrip1567257712855 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" ADD "depot_in" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "depot_out" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_42f23f929fdddf10e05724cf958"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "UQ_42f23f929fdddf10e05724cf958"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_42f23f929fdddf10e05724cf958" FOREIGN KEY ("trip_class_id") REFERENCES "trip_classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_42f23f929fdddf10e05724cf958"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "UQ_42f23f929fdddf10e05724cf958" UNIQUE ("trip_class_id")`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_42f23f929fdddf10e05724cf958" FOREIGN KEY ("trip_class_id") REFERENCES "trip_classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "depot_out"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "depot_in"`);
    }

}
