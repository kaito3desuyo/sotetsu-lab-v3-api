import {MigrationInterface, QueryRunner} from "typeorm";

export class FixVehicle1567246768717 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_97a57b7389989efc352bef8af3a" UNIQUE ("vehicle_number")`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_97a57b7389989efc352bef8af3a"`);
    }

}
