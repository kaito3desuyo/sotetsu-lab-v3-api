import {MigrationInterface, QueryRunner} from "typeorm";

export class FixTrip1567262962272 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_50697e60adb4e1ded1237376645" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trips" ADD CONSTRAINT "FK_351b39dbca2fae05cb18444bc0e" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_351b39dbca2fae05cb18444bc0e"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_50697e60adb4e1ded1237376645"`);
    }

}
