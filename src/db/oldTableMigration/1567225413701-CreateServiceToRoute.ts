import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class CreateServiceToRoute1567225413701 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "route_systems" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "route_id" uuid NOT NULL, "service_id" uuid NOT NULL, "sequence" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_70f8e515948eff19012fe13dc48" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP TABLE "route_systems"`);
  }
}
