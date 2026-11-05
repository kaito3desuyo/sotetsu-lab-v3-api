#!/usr/bin/env bash
# 本番と手元の public のスキーマ、hook 関数・イベントトリガー・auth のトリガー・権限を比べて差を出す。本番へは読み取りだけ。
# 使い方: npm run db:compare-schema
# 差があっても止めない（終了コード 0）。差が 0 なら「スキーマの差 0」と出す。
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

WORK_DIR=".context/compare-schema"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

require_local_db
load_prod_env
check_prod_connection

# pg_dump の出力から、版・日時・乱数(\restrict の鍵)・owner・SET・コメント行など、スキーマの中身でない所を落とす
normalize() {
    sed -E \
        -e '/^--/d' \
        -e '/^\\(un)?restrict /d' \
        -e '/^SET /d' \
        -e '/^SELECT pg_catalog\.set_config/d' \
        -e '/^[[:space:]]*$/d' \
        -e 's/ OWNER TO [^;]+;/;/'
}

DUMP_ARGS=(--schema-only --no-owner --no-privileges -n public)
prod_exec pg_dump "${DUMP_ARGS[@]}" | normalize >"$WORK_DIR/prod-dump.sql"
local_exec pg_dump -U postgres "${DUMP_ARGS[@]}" | normalize >"$WORK_DIR/local-dump.sql"

# pg_dump が出さない物・privileges を、カタログから同じ問い合わせで取って比べる。
# owner は見ない（権限は owner 自身の分と付与者を除いて、他の role への分だけ比べる）
CATALOG_SQL=$(
    cat <<'SQL'
select '[extension] ' || e.extname || ' schema=' || e.extnamespace::regnamespace
from pg_extension e where e.extname not in (__MANAGED__)
union all
select '[function] ' || p.oid::regprocedure || ' secdef=' || p.prosecdef || ' config=' || coalesce(p.proconfig::text, '-') || ' acl=' || coalesce((select string_agg((case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end) || '=' || a.privilege_type || case when a.is_grantable then '*' else '' end, ',' order by (case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end), a.privilege_type) from aclexplode(p.proacl) a where a.grantee <> p.proowner), '-')
from pg_proc p where p.pronamespace = 'public'::regnamespace
union all
select '[relation acl] ' || c.relname || ' kind=' || c.relkind::text || ' rls=' || c.relrowsecurity || ' acl=' || coalesce((select string_agg((case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end) || '=' || a.privilege_type || case when a.is_grantable then '*' else '' end, ',' order by (case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end), a.privilege_type) from aclexplode(c.relacl) a where a.grantee <> c.relowner), '-')
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'S')
union all
select '[policy] ' || schemaname || '.' || tablename || ' ' || policyname || ' roles=' || roles::text || ' cmd=' || cmd::text || ' qual=' || coalesce(qual, '-') || ' check=' || coalesce(with_check, '-')
from pg_policies where schemaname = 'public'
union all
select '[schema acl] ' || nspname || ' ' || coalesce(nspacl::text, '-') from pg_namespace where nspname = 'public'
union all
select '[default acl] for ' || pg_get_userbyid(d.defaclrole) || ' ' || d.defaclobjtype::text || ' ' || d.defaclnamespace::regnamespace::text || ' ' || d.defaclacl::text
from pg_default_acl d where d.defaclnamespace = 'public'::regnamespace
union all
select '[event trigger] ' || e.evtname || ' on ' || e.evtevent || ' tags=' || coalesce(e.evttags::text, '-') || ' fn=' || n.nspname || '.' || p.proname || ' enabled=' || e.evtenabled::text
from pg_event_trigger e join pg_proc p on p.oid = e.evtfoid join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
union all
select '[auth trigger] ' || cn.nspname || '.' || c.relname || ' ' || pg_get_triggerdef(t.oid) || ' enabled=' || t.tgenabled::text
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and cn.nspname = 'auth' and pn.nspname = 'public'
order by 1;
SQL
)
CATALOG_SQL="${CATALOG_SQL//__MANAGED__/$SUPABASE_MANAGED_EXTENSIONS}"
prod_sql <<<"$CATALOG_SQL" >"$WORK_DIR/prod-catalog.txt"
local_sql <<<"$CATALOG_SQL" >"$WORK_DIR/local-catalog.txt"

differences=0

echo "== スキーマ(public, pg_dump --schema-only, owner・privileges 抜き) =="
if diff -u --label 本番 --label 手元 "$WORK_DIR/prod-dump.sql" "$WORK_DIR/local-dump.sql" >"$WORK_DIR/dump.diff"; then
    echo "差 0"
else
    differences=$((differences + 1))
    cat "$WORK_DIR/dump.diff"
fi

echo
echo "== hook 関数・イベントトリガー・auth のトリガー・権限（カタログ） =="
if diff -u --label 本番 --label 手元 "$WORK_DIR/prod-catalog.txt" "$WORK_DIR/local-catalog.txt" >"$WORK_DIR/catalog.diff"; then
    echo "差 0"
else
    differences=$((differences + 1))
    cat "$WORK_DIR/catalog.diff"
fi

echo
if [[ "$differences" -eq 0 ]]; then
    echo "スキーマの差 0"
else
    echo "スキーマに差がある（上の diff）。migration に起こすか、手元の config・seed に足して差を 0 にすること"
fi
exit 0
