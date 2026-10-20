import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data API は閉じているが、誰かが開けても anon・authenticated（Supabase の既定で全表に権限がある）からは何も触れないよう、権限を剥がしておく。
 * これから作る表・関数にも付かないよう、既定の権限からも外す。
 */
export class RevokeDataApiPrivilegesFromAnon1792424243223
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`,
        );
        await queryRunner.query(
            `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`,
        );
        await queryRunner.query(
            `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, public`,
        );
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`,
        );
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated`,
        );
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, public`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, public`,
        );
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated`,
        );
        await queryRunner.query(
            `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated`,
        );
        await queryRunner.query(
            `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, public`,
        );
        await queryRunner.query(
            `GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated`,
        );
        await queryRunner.query(
            `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`,
        );
        // CreateProfiles で閉じたものは閉じたままにする
        await queryRunner.query(
            `REVOKE ALL ON TABLE "profiles" FROM anon, authenticated`,
        );
        await queryRunner.query(
            `REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public`,
        );
    }
}
