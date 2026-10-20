import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ゲストの匿名セッション（auth.users の is_anonymous）には profiles を作らない。
 * 匿名の利用者は email が無く username が NULL になって INSERT が落ち、匿名サインインごと失敗するため。
 * profiles が無いので hook も user_role・display_name を付けない（API では役割なし）。
 */
export class SkipProfileForAnonymousUsers1792452840929
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP TRIGGER on_auth_user_created ON auth.users`,
        );
        await queryRunner.query(`
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            WHEN (NOT NEW.is_anonymous)
            EXECUTE FUNCTION public.create_profile_on_auth_user_insert()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP TRIGGER on_auth_user_created ON auth.users`,
        );
        await queryRunner.query(`
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_auth_user_insert()
        `);
    }
}
