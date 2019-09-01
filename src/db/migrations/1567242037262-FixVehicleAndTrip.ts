import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixVehicleAndTrip1567242037262 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "PK_646538c1681430517abb70916b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "PK_646538c1681430517abb70916b0" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "car_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "car_number" smallint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "trip_name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "calender_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "extra_calender_id" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "extra_calender_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "calender_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "trip_name" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "car_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "car_number" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "PK_646538c1681430517abb70916b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "PK_646538c1681430517abb70916b0" PRIMARY KEY ("id")`,
    );
  }
}
