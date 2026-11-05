-- 手元専用の試験アカウント 4 つ（役割ごとに 1 つ）。copy-from-prod.sh が最後に流す。何度流しても同じ結果になる。
--   メール: dev-<role>@example.test / パスワード: dev-password（手元専用の固定値）
--   ゲストは匿名ログイン（signInAnonymously）で足りるのでここでは作らない。
--
-- auth.users に insert すると、本番と同じトリガー on_auth_user_created
-- （public.create_profile_on_auth_user_insert）が profiles を役割 reporter で作る。
-- そのあと profiles.role を各アカウントの役割に更新する。トークンの user_role は
-- custom_access_token_hook がこの profiles.role から入れる。

begin;

-- 作り直し（auth.identities・profiles は auth.users への外部キーの cascade で消える）
delete from auth.users where email in (
    'dev-reporter@example.test',
    'dev-editor@example.test',
    'dev-manager@example.test',
    'dev-viewer@example.test'
);

with accounts(id, email, role) as (
    values
        ('00000000-0000-4000-8000-0000000000a1'::uuid, 'dev-reporter@example.test', 'reporter'),
        ('00000000-0000-4000-8000-0000000000a2'::uuid, 'dev-editor@example.test', 'editor'),
        ('00000000-0000-4000-8000-0000000000a3'::uuid, 'dev-manager@example.test', 'manager'),
        ('00000000-0000-4000-8000-0000000000a4'::uuid, 'dev-viewer@example.test', 'viewer')
)
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('dev-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('email_verified', true),
    false, now(), now(),
    '', '', '', '', '', '', '', ''
from accounts;

-- メール・パスワードでのログインに使われる identity
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
    u.id::text, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
from auth.users u
where u.email like 'dev-%@example.test';

-- profile はトリガーが reporter で作っている。役割を設定する
update public.profiles p
set role = split_part(split_part(u.email, '@', 1), '-', 2), updated_at = now()
from auth.users u
where p.user_id = u.id
  and u.email like 'dev-%@example.test';

commit;
