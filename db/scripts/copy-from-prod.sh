#!/usr/bin/env bash
# 本番の公共のデータを手元の Supabase へ写し直す（本番へは読み取りだけ）。
# 使い方: npm run db:copy-from-prod   （先に npx supabase start で手元の Supabase を立てておく）
#
# 流れ: 1) 本番から取り出す（スキーマ・hook などの追加物・データ）→ 2) 手元を作り直す →
#       3) スキーマ・データを入れる → 4) 試験アカウントを作る → 5) 一覧に無い表を知らせる → 6) スキーマの比べ
# 取り出しが全部済んでから手元を作り直す。途中で本番に届かなくなっても手元を空のまま残さない。
# 写す表・写さない表は copy-from-prod.tables.txt。ダンプは .context/ に置き、終わったら消す。
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

START_SECONDS=$SECONDS
WORK_DIR=".context/copy-from-prod"

# いまどこまで進んだか。終わるとき（成功・失敗・Ctrl-C のどれでも）に状態を 3 つのどれかで知らせ、取り出したダンプを必ず消す
#   extract: 本番から取り出し中（手元の DB には触れていない）
#   rebuild: 手元の作り直し中（supabase db reset の開始から試験アカウントを作り終えるまで。手元は中途半端になりうる）
#   done:    手元の作り直しは済んだ（残りは行数・スキーマの確認だけ）
STAGE="extract"

# 取り出し中の Ctrl-C などで終わるとき、実行中の命令の stderr のリダイレクトが残っていることがある。状態表示は退避した fd 3（元の stderr）に出す
exec 3>&2

finish() {
    local code=$?
    trap - EXIT INT TERM
    rm -r -f -- "$WORK_DIR"
    if [[ "$code" -ne 0 ]]; then
        echo >&3
        case "$STAGE" in
        extract)
            echo "本番からの取り出しの途中で止まった（終了コード $code）。手元の DB には触れていない（前の状態のまま）" >&3
            ;;
        rebuild)
            echo "手元の作り直しの途中で止まった（終了コード $code）。手元は中途半端な状態。もう一度 npm run db:copy-from-prod を流すと、本番から取り直して作り直す" >&3
            ;;
        done)
            echo "手元の作り直しは済んでいる。そのあとの確認（行数・スキーマの比べ）の途中で止まった（終了コード $code）" >&3
            ;;
        esac
        echo "取り出したダンプは消した" >&3
    fi
    exit "$code"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

step() {
    echo
    echo "== $* =="
}

require_local_db
load_prod_env
step "本番への接続"
check_prod_connection
echo "接続: ${PROD_CONNECT_MODE} user=${PGUSER%%.*}.**** db=${PGDATABASE}（問い合わせは BEGIN READ ONLY、pg_dump は自前の読み取り専用トランザクション）"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

mapfile -t COPY_TABLES < <(table_list copy)
mapfile -t SKIP_TABLES < <(table_list skip)
if [[ "${#COPY_TABLES[@]}" -eq 0 ]]; then
    echo "copy-from-prod.tables.txt に写す表が無い" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
step "1. 本番から取り出す"

# 本番の public の表（表・パーティション表）
prod_sql >"$WORK_DIR/prod-tables.txt" <<'SQL'
select c.relname
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by 1;
SQL

# 一覧にある表が本番に無ければ止める（表名の書き間違い・改名を見逃さない）
missing_in_prod=()
for t in "${COPY_TABLES[@]}"; do
    grep -qx "$t" "$WORK_DIR/prod-tables.txt" || missing_in_prod+=("$t")
done
if [[ "${#missing_in_prod[@]}" -gt 0 ]]; then
    echo "写す表の一覧にあるのに本番の public に無い表: ${missing_in_prod[*]}" >&2
    echo "copy-from-prod.tables.txt を直すこと" >&2
    exit 1
fi

# 拡張: public の型（postgis の geometry など）が使う物。スキーマより先に手元へ入れる
echo "拡張を取り出す"
prod_sql >"$WORK_DIR/extensions.sql" <<SQL
select format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I;', e.extname, n.nspname)
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
where e.extname not in ($SUPABASE_MANAGED_EXTENSIONS)
order by e.extname;
SQL

# スキーマ: public だけ。owner は手元では postgres に付ける。privileges（GRANT・hook 関数の権限）は残す
echo "スキーマ(public)を取り出す"
prod_exec pg_dump --schema-only --no-owner -n public >"$WORK_DIR/schema.sql"

# pg_dump -n public に入らない物: auth のテーブルに付いた public の関数を呼ぶトリガー、public の関数を呼ぶイベントトリガー
echo "auth のトリガー・イベントトリガー(ensure_rls など)を取り出す"
prod_sql >"$WORK_DIR/extras.sql" <<'SQL'
select 'SET search_path TO public;';
select pg_get_triggerdef(t.oid) || ';'
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and cn.nspname = 'auth' and pn.nspname = 'public'
order by c.relname, t.tgname;
-- 手元では event trigger を superuser(supabase_admin)が作るため、呼ぶ関数も superuser の持ち物にする（本番は postgres の持ち物。owner の差はスキーマの比べでは見ない）
select format('ALTER FUNCTION %I.%I() OWNER TO supabase_admin;', n.nspname, p.proname)
from pg_event_trigger e
join pg_proc p on p.oid = e.evtfoid
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by e.evtname;
select format(
    'CREATE EVENT TRIGGER %I ON %s%s EXECUTE FUNCTION %I.%I();',
    e.evtname, e.evtevent,
    case when e.evttags is null then ''
         else ' WHEN TAG IN (' || (select string_agg(quote_literal(x), ', ') from unnest(e.evttags) as x) || ')' end,
    n.nspname, p.proname)
from pg_event_trigger e
join pg_proc p on p.oid = e.evtfoid
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by e.evtname;
SQL

# データ: 写す表だけ（custom 形式）
echo "データを取り出す(${#COPY_TABLES[@]} 表)"
dump_args=()
for t in "${COPY_TABLES[@]}"; do
    dump_args+=(-t "public.$t")
done
# trip_operation_lists の自己参照の外部キーで pg_dump が警告を出すが、pg_restore の側で問題なく入る。失敗したときだけ出力を見せる
if ! prod_exec pg_dump --data-only --format=custom "${dump_args[@]}" >"$WORK_DIR/data.dump" 2>"$WORK_DIR/data-dump.log"; then
    cat "$WORK_DIR/data-dump.log" >&2
    exit 1
fi

# 取り出した後の本番の行数（手元との比べ用）
{
    echo 'select' "'x', 0 where false"
    for t in "${COPY_TABLES[@]}"; do
        echo "union all select '$t', count(*) from public.\"$t\""
    done
    echo 'order by 1;'
} | prod_sql >"$WORK_DIR/prod-counts.txt"

du -h "$WORK_DIR/extensions.sql" "$WORK_DIR/schema.sql" "$WORK_DIR/extras.sql" "$WORK_DIR/data.dump" | sed 's#^#  #'

# ---------------------------------------------------------------------------
step "2. 手元を作り直す（supabase db reset）"
STAGE="rebuild"
npx supabase db reset 2>&1 | tail -n 15

# Auth のコンテナが auth スキーマを作り終えるのを待つ
for _ in $(seq 1 60); do
    if [[ "$(local_sql <<<"select to_regclass('auth.users') is not null and to_regclass('auth.identities') is not null;" 2>/dev/null || true)" == "t" ]]; then
        break
    fi
    sleep 2
done
if [[ "$(local_sql <<<"select to_regclass('auth.users') is not null;")" != "t" ]]; then
    echo "supabase db reset の後、手元の auth.users ができなかった" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
step "3. スキーマとデータを入れる"
echo "拡張"
local_admin_sql <"$WORK_DIR/extensions.sql"
echo "スキーマ(public)"
# 手元の public は Supabase が作ってあるので、ダンプの CREATE SCHEMA public は外す。
# supabase_admin の既定権限は Supabase が手元にも最初から入れてある（postgres 権限では変えられない）ので外す
sed -e '/^CREATE SCHEMA public;$/d' -e '/^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin /d' "$WORK_DIR/schema.sql" >"$WORK_DIR/schema-load.sql"
# 手元の postgres の既定権限(public)は anon・authenticated にも付いているが、本番は postgres・service_role だけ。
# ダンプは足す GRANT しか持たないので、先に空にして本番に合わせる
local_sql <<'SQL'
alter default privileges for role postgres in schema public revoke all on tables from postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from postgres, anon, authenticated, service_role;
SQL
if ! local_exec psql -X -U postgres -q -t -v ON_ERROR_STOP=1 -f - <"$WORK_DIR/schema-load.sql" >"$WORK_DIR/schema-load.log" 2>&1; then
    tail -n 20 "$WORK_DIR/schema-load.log" >&2
    exit 1
fi
echo "auth のトリガー・イベントトリガー"
local_admin_sql <"$WORK_DIR/extras.sql"
echo "データ"
local_exec pg_restore -U postgres -d postgres --data-only --no-owner --single-transaction --exit-on-error <"$WORK_DIR/data.dump"
echo "ANALYZE"
analyze_tables=$(printf 'public.%s,' "${COPY_TABLES[@]}")
local_exec psql -X -U postgres -q -c "ANALYZE ${analyze_tables%,};"

# ---------------------------------------------------------------------------
step "4. 試験アカウントを作る"
local_sql <"$REPO_ROOT/db/scripts/seed-dev-accounts.sql"
local_sql <<'SQL'
select u.email, p.role, p.username
from auth.users u join public.profiles p on p.user_id = u.id
order by u.email;
SQL

# 手元は使える状態になった。これ以降の失敗は「手元が中途半端」ではない
STAGE="done"

# ---------------------------------------------------------------------------
step "5. 行数と、一覧に無い表"
echo "行数（本番 / 手元）。本番はダンプの直後に数えたので、取り出し中に増えた分だけ手元が少ないことがある"
count_ng=0
while IFS='|' read -r table prod_count; do
    [[ -z "$table" ]] && continue
    local_count="$(local_sql <<<"select count(*) from public.\"$table\";")"
    mark=""
    if [[ "$prod_count" != "$local_count" ]]; then
        mark="  <- 差あり"
        count_ng=$((count_ng + 1))
    fi
    printf '  %-36s %9s / %9s%s\n' "$table" "$prod_count" "$local_count" "$mark"
done <"$WORK_DIR/prod-counts.txt"
if [[ "$count_ng" -gt 0 ]]; then
    echo "行数に差がある表が ${count_ng} 個ある"
fi

echo
echo "写さない表（手元が空であること。profiles は試験アカウントの 4 行だけ）"
for t in "${SKIP_TABLES[@]}"; do
    n="$(local_sql <<<"select count(*) from public.\"$t\";" 2>/dev/null || echo '(手元に無い)')"
    printf '  %-36s %s\n' "$t" "$n"
done

unlisted=()
while IFS= read -r t; do
    [[ -z "$t" ]] && continue
    if [[ " ${COPY_TABLES[*]} ${SKIP_TABLES[*]} " != *" $t "* ]]; then
        unlisted+=("$t")
    fi
done <"$WORK_DIR/prod-tables.txt"
echo
if [[ "${#unlisted[@]}" -gt 0 ]]; then
    echo "!! 本番の public にあるのに、写す(copy)にも写さない(skip)にも無い表: ${unlisted[*]}"
    echo "!! 公共のデータなら copy、個人に結びつくなら skip として db/scripts/copy-from-prod.tables.txt に足すこと（この表は手元に写されていない）"
else
    echo "本番の public の表は全て copy か skip のどちらかに入っている"
fi

# ---------------------------------------------------------------------------
step "6. スキーマの比べ"
bash "$REPO_ROOT/db/scripts/compare-schema.sh"

# ---------------------------------------------------------------------------
echo
echo "完了: $((SECONDS - START_SECONDS)) 秒かかった（ダンプの一時ファイルは消した）"
