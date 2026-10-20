import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 匿名サインインのために Supabase の「Allow new users to sign up」をオンにすると、
 * publishable key で /auth/v1/signup からメールの利用者を勝手に作れてしまう。
 * Before User Created hook で匿名以外を拒む。登録は backend が管理 API（createUser）で行い、管理 API はこの hook を通らない。
 * hook の有効化はダッシュボード（Authentication → Hooks）で行う。
 */
export class AllowOnlyAnonymousSelfSignup1792454069311
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
            RETURNS jsonb
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF coalesce((event->'user'->>'is_anonymous')::boolean, false) THEN
                    RETURN '{}'::jsonb;
                END IF;
                RETURN jsonb_build_object(
                    'error', jsonb_build_object('http_code', 403, 'message', 'Signups not allowed.')
                );
            END;
            $$
        `);
        await queryRunner.query(
            `GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO supabase_auth_admin`,
        );
        await queryRunner.query(
            `REVOKE EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) FROM anon, authenticated, public`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP FUNCTION public.before_user_created_hook(jsonb)`,
        );
    }
}
