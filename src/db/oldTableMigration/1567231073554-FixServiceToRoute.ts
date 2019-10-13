import { MigrationInterface, QueryRunner } from 'typeorm';
// tslint:disable: max-line-length
export class FixServiceAndRoute1567231073554 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_systems" ADD CONSTRAINT "FK_a570b74c62664187a46d9f735f5" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_systems" ADD CONSTRAINT "FK_50fa3af4e537da7f277b355983d" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "route_systems" DROP CONSTRAINT "FK_50fa3af4e537da7f277b355983d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_systems" DROP CONSTRAINT "FK_a570b74c62664187a46d9f735f5"`,
    );
  }
}
