import {MigrationInterface, QueryRunner} from "typeorm";

export class FixVehicle1567241716961 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "scrapped_date" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP COLUMN "vehicle_id"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD "vehicle_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" DROP COLUMN "vehicle_id"`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD "vehicle_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "scrapped_date" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
