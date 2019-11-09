import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTime1573281002242 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `CREATE INDEX "IDX_334ddf0d2c159db2cff28000bb" ON "times" ("stop_sequence") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6649d570c702bab71c5d95e9f8" ON "times" ("pickup_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d49d91daffc9fbe9fd0f37fb06" ON "times" ("dropoff_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a8b12e7201a60ae8392d8ef5d" ON "times" ("arrival_days") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b8dc42fd5ea0101361301029f" ON "times" ("arrival_time") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48f5b8dc8e5d05d83b4cb1a0bf" ON "times" ("departure_days") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90e25c90aa9129dc9968ce0010" ON "times" ("departure_time") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_90e25c90aa9129dc9968ce0010"`);
    await queryRunner.query(`DROP INDEX "IDX_48f5b8dc8e5d05d83b4cb1a0bf"`);
    await queryRunner.query(`DROP INDEX "IDX_1b8dc42fd5ea0101361301029f"`);
    await queryRunner.query(`DROP INDEX "IDX_1a8b12e7201a60ae8392d8ef5d"`);
    await queryRunner.query(`DROP INDEX "IDX_d49d91daffc9fbe9fd0f37fb06"`);
    await queryRunner.query(`DROP INDEX "IDX_6649d570c702bab71c5d95e9f8"`);
    await queryRunner.query(`DROP INDEX "IDX_334ddf0d2c159db2cff28000bb"`);
  }
}
