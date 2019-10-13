import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameOperatingSystem1568633484534 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "operating_systems" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "route_id" uuid NOT NULL, "sequence" smallint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bbc32484423a308be83d8cc2e8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_52e16952d65ab52eb2523492d30" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" ADD CONSTRAINT "FK_688ebe76aa58bb58d493241b0b9" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_688ebe76aa58bb58d493241b0b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_systems" DROP CONSTRAINT "FK_52e16952d65ab52eb2523492d30"`,
    );
    await queryRunner.query(`DROP TABLE "operating_systems"`);
  }
}
