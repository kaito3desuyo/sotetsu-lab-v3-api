import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFormationAndVehicle1573893239700 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" DROP CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_bdcb5fc63380379e24bba77e44a" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_formations" ADD CONSTRAINT "FK_7fba0290b9cb01725b6b020ea75" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
