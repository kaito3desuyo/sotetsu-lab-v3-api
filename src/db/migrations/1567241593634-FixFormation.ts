import {MigrationInterface, QueryRunner} from "typeorm";

export class FixFormation1567241593634 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP COLUMN "formation_id"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD "formation_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e"`);
        await queryRunner.query(`ALTER TABLE "formations" DROP CONSTRAINT "PK_e071aaba3322392364953ba5c95"`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "formations" ADD CONSTRAINT "PK_e071aaba3322392364953ba5c95" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "agency_id"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "agency_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "formation_description"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "formation_description" text`);
        await queryRunner.query(`ALTER TABLE "formations" ALTER COLUMN "end_date" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "formation_id"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "formation_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" DROP COLUMN "formation_id"`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD "formation_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "formations" ALTER COLUMN "end_date" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "formation_description"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "formation_description" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "agency_id"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "agency_id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" DROP CONSTRAINT "PK_e071aaba3322392364953ba5c95"`);
        await queryRunner.query(`ALTER TABLE "formations" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "formations" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "formations" ADD CONSTRAINT "PK_e071aaba3322392364953ba5c95" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "operation_sightings" ADD CONSTRAINT "FK_8c6951686b6a2d4b3dd83e1d44e" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP COLUMN "formation_id"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD "formation_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
