import {MigrationInterface, QueryRunner} from "typeorm";

export class FixFormation1568633010414 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "formations" ADD CONSTRAINT "FK_dfeba01a5bd41817c3f0e51dee2" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "formations" DROP CONSTRAINT "FK_dfeba01a5bd41817c3f0e51dee2"`);
    }

}
