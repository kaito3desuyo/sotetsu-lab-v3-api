import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOperationSightingManagement1754910017287 implements MigrationInterface {
    name = 'AddOperationSightingManagement1754910017287'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "operation_sighting_invalidations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operation_sighting_id" uuid NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_191870b31bbc8d2ed609eb1f15" UNIQUE ("operation_sighting_id"), CONSTRAINT "PK_7753c3009e9e7e60a7367013298" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "operation_sighting_management_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operation_sighting_id" uuid NOT NULL, "user_id" uuid NOT NULL, "action" text NOT NULL, "reason" text NOT NULL, "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fd573ef1ad95a2b9c7bed70300b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" ADD CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_management_logs" ADD CONSTRAINT "FK_53eb491fdb237ee37237227fcbc" FOREIGN KEY ("operation_sighting_id") REFERENCES "operation_sightings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operation_sighting_management_logs" DROP CONSTRAINT "FK_53eb491fdb237ee37237227fcbc"`);
        await queryRunner.query(`ALTER TABLE "operation_sighting_invalidations" DROP CONSTRAINT "FK_191870b31bbc8d2ed609eb1f157"`);
        await queryRunner.query(`DROP TABLE "operation_sighting_management_logs"`);
        await queryRunner.query(`DROP TABLE "operation_sighting_invalidations"`);
    }

}
