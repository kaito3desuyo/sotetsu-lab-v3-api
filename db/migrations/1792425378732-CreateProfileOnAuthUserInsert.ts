import { MigrationInterface, QueryRunner } from 'typeorm';

const HOOK_WITH_ROLE_ONLY = `
    CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    AS $$
    DECLARE
        claims jsonb;
        profile_role text;
    BEGIN
        SELECT role INTO profile_role FROM public.profiles WHERE user_id = (event->>'user_id')::uuid;
        claims := event->'claims';
        IF profile_role IS NOT NULL THEN
            claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_role));
        END IF;
        RETURN jsonb_set(event, '{claims}', claims);
    END;
    $$
`;

/**
 * backend が profiles を読み書きしないようにする（Data API を閉じるため）。
 * - 登録: auth.users に行が入ったら、trigger が profiles の行を作る。役割は reporter 固定（user_metadata は利用者が書き換えられるので役割を置かない）
 * - プロフィール: hook が display_name も JWT に入れ、backend はトークンから返す
 */
export class CreateProfileOnAuthUserInsert1792425378732
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION public.create_profile_on_auth_user_insert()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = ''
            AS $$
            BEGIN
                INSERT INTO public.profiles (user_id, username, display_name, role, created_at, updated_at)
                VALUES (
                    NEW.id,
                    lower(split_part(NEW.email, '@', 1)),
                    coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
                    'reporter',
                    NEW.created_at,
                    NEW.created_at
                );
                RETURN NEW;
            END;
            $$
        `);
        await queryRunner.query(
            `REVOKE EXECUTE ON FUNCTION public.create_profile_on_auth_user_insert() FROM anon, authenticated, public`,
        );
        await queryRunner.query(`
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_auth_user_insert()
        `);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
            RETURNS jsonb
            LANGUAGE plpgsql
            STABLE
            AS $$
            DECLARE
                claims jsonb;
                profile record;
            BEGIN
                SELECT role, display_name INTO profile FROM public.profiles WHERE user_id = (event->>'user_id')::uuid;
                claims := event->'claims';
                IF FOUND THEN
                    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.role));
                    claims := jsonb_set(claims, '{display_name}', to_jsonb(profile.display_name));
                END IF;
                RETURN jsonb_set(event, '{claims}', claims);
            END;
            $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(HOOK_WITH_ROLE_ONLY);
        await queryRunner.query(
            `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
        );
        await queryRunner.query(
            `DROP FUNCTION IF EXISTS public.create_profile_on_auth_user_insert()`,
        );
    }
}
