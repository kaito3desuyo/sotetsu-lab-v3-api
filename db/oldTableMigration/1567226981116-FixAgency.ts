import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixAgency1567226981116 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "FK_7642ed6f5276084f2e463793c29"`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "agency_id"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "agency_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28"`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "parent_agency_number" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_name" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "agency_type"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "agency_type" smallint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_phone" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_fare_url" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "FK_7642ed6f5276084f2e463793c29" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "routes" DROP CONSTRAINT "FK_7642ed6f5276084f2e463793c29"`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_fare_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_phone" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_url" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "agency_type"`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD "agency_type" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "agency_name" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" ALTER COLUMN "parent_agency_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "agencies" DROP CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28"`,
    );
    await queryRunner.query(`ALTER TABLE "agencies" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "agencies" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "agencies" ADD CONSTRAINT "PK_8ab1f1f53f56c8255b0d7e68b28" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "agency_id"`);
    await queryRunner.query(
      `ALTER TABLE "routes" ADD "agency_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ADD CONSTRAINT "FK_7642ed6f5276084f2e463793c29" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
