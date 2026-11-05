#!/usr/bin/env bash
# copy-from-prod.sh と compare-schema.sh の共通部分（source して使う）。
# 本番へは読み取りだけ。pg_dump / psql は手元の Supabase の DB コンテナの中のものを使う。

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PROD_ENV_FILE=".env.local.prod"

# DB コンテナ名は supabase/config.toml の project_id から決まる（supabase_db_<project_id>）
project_id="$(sed -nE 's/^project_id *= *"([^"]+)".*/\1/p' supabase/config.toml | head -1)"
DB_CONTAINER="supabase_db_${project_id}"

require_local_db() {
    if [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
        echo "手元の Supabase の DB コンテナ($DB_CONTAINER)が動いていない。先に npx supabase start を流すこと" >&2
        exit 1
    fi
}

# 本番の接続情報を .env.local.prod の DATABASE_URL から PG* 環境変数に入れる（値は出さない）。
# 本番へは pooler の session mode（同じホストの 5432）で入る。transaction mode（6543）は pg_dump に向かない。
load_prod_env() {
    if [[ ! -f "$PROD_ENV_FILE" ]]; then
        echo "$PROD_ENV_FILE が無い。.env.local.prod.example を写して本番の値を入れること" >&2
        exit 1
    fi
    local assignments
    assignments="$(grep -E '^DATABASE_URL=' "$PROD_ENV_FILE" | tail -1 | node "$REPO_ROOT/db/scripts/lib-parse-url.mjs")" || {
        echo "$PROD_ENV_FILE の DATABASE_URL が無いか URL として読めない" >&2
        exit 1
    }
    eval "$assignments"
    # 本番（Supabase のクラウド）以外には繋がない。手元を本番と取り違えて写さないため
    case "$PGHOST" in
    *.supabase.com | *.supabase.co) ;;
    *)
        echo "$PROD_ENV_FILE の DATABASE_URL が本番(*.supabase.com / *.supabase.co)を向いていない" >&2
        exit 1
        ;;
    esac
    export PGPORT=5432
    # pooler は options を捨てる（Task 1 で実測）が、直結の場合に効くので付ける。実際の保証は prod_sql の SET と pg_dump の READ ONLY
    export PGOPTIONS='-c default_transaction_read_only=on'
    # session mode で繋がらなければ直結（db.<ref>.supabase.co）を試す
    PROD_REF="${PGUSER#*.}"
    PROD_DIRECT_HOST="db.${PROD_REF}.supabase.co"
    PROD_DIRECT_USER="${PGUSER%%.*}"
}

# マスク: 接続情報が混ざり得る出力から、ユーザー名の ref とパスワードを伏せる
mask() {
    sed -E 's/(postgres)\.[a-z0-9]{12,}/\1.****/g; s#(://[^:/@]+:)[^@]+@#\1****@#g'
}

# コンテナの中で本番に向けてコマンドを流す
prod_exec() {
    docker exec -i -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGOPTIONS "$DB_CONTAINER" "$@"
}

# 標準入力の SQL を本番で流す（先頭で読み取り専用にする。結果は区切り '|' の素のテキスト）
prod_sql() {
    { echo 'SET default_transaction_read_only = on;'; cat; } |
        prod_exec psql -X -A -t -F '|' -q -v ON_ERROR_STOP=1 -f -
}

# 手元に向けて流す（postgres 権限）
local_exec() {
    docker exec -i "$DB_CONTAINER" "$@"
}

local_sql() {
    local_exec psql -X -U postgres -A -t -F '|' -q -v ON_ERROR_STOP=1 -f -
}

# 手元の特権（イベントトリガーなど）が要るときだけ使う
local_admin_sql() {
    local_exec psql -X -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1 -f -
}

# 本番に繋がることを確かめる。session mode で駄目なら直結
check_prod_connection() {
    if prod_sql <<<'select 1;' >/dev/null 2>&1; then
        PROD_CONNECT_MODE="session mode ($PGHOST:$PGPORT)"
        return 0
    fi
    local pooler_host="$PGHOST" pooler_user="$PGUSER"
    export PGHOST="$PROD_DIRECT_HOST" PGUSER="$PROD_DIRECT_USER"
    if prod_sql <<<'select 1;' >/dev/null 2>&1; then
        PROD_CONNECT_MODE="直結 ($PGHOST:$PGPORT)"
        return 0
    fi
    export PGHOST="$pooler_host" PGUSER="$pooler_user"
    echo "本番に繋がらない（session mode も直結も）。ネットワークと $PROD_ENV_FILE を確かめること" >&2
    return 1
}

# copy-from-prod.tables.txt から表名を取り出す（copy / skip）
table_list() {
    awk -v kind="$1" '$1 == kind { print $2 }' "$REPO_ROOT/db/scripts/copy-from-prod.tables.txt"
}

# 本番に入っている拡張のうち、Supabase が手元にも最初から入れている物・運用の道具は除く（これ以外は public の型や関数が使う物とみなして手元にも入れる）
SUPABASE_MANAGED_EXTENSIONS="'plpgsql','pg_stat_statements','pgcrypto','pgjwt','pgsodium','supabase_vault','uuid-ossp','pg_graphql','pg_net','pg_cron','hypopg','index_advisor'"
