import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class AddTripBlock1567318928586 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE TABLE "trip_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3b72e3959ee5b124be1452acb61" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_7896e8b6b9950984372a3805f78" FOREIGN KEY ("trip_block_id") REFERENCES "trip_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT "FK_7896e8b6b9950984372a3805f78"`,
    );
    await queryRunner.query(`DROP TABLE "trip_blocks"`);
  }
}
