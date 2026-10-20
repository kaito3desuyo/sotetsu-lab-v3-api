import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfiles1792406959693 implements MigrationInterface {
    name = 'CreateProfiles1792406959693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "profiles" ("user_id" uuid NOT NULL, "username" text NOT NULL, "display_name" text NOT NULL, "role" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d1ea35db5be7c08520d70dc03f8" UNIQUE ("username"), CONSTRAINT "PK_9e432b7df0d182f8d292902d1a2" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_user_id_auth_users" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`REVOKE ALL ON TABLE "profiles" FROM anon, authenticated`);
        await queryRunner.query(`GRANT SELECT ON TABLE "profiles" TO supabase_auth_admin`);
        await queryRunner.query(`CREATE POLICY "auth admin reads profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true)`);
        await queryRunner.query(`
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
        `);
        await queryRunner.query(`GRANT USAGE ON SCHEMA public TO supabase_auth_admin`);
        await queryRunner.query(`GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin`);
        await queryRunner.query(`REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb)`);
        await queryRunner.query(`DROP POLICY IF EXISTS "auth admin reads profiles" ON "profiles"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profiles_user_id_auth_users"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
    }

}
