#!/usr/bin/env bash
# 本番 DB への migration:run の専用の口（本番へ書ける唯一の口）。
# .env.local.prod の接続先と未適用の migration を見せ、yes と打たれたときだけ流す。
# 使い方: npm run migration:run:prod
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

ENV_FILE=".env.local.prod"
DATA_SOURCE="src/core/utils/data-source.ts"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "$ENV_FILE が無い。.env.local.prod.example を写して本番の値を入れること" >&2
    exit 1
fi

# 接続先（パスワードは出さない）
echo "== 接続先（$ENV_FILE） =="
npm run --silent dotenv:prod -- node -e '
try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    console.log(`host=${u.hostname} port=${u.port || 5432} db=${u.pathname.slice(1)} user=${u.username} password=****`);
} catch {
    console.error("DATABASE_URL が無いか URL として読めない");
    process.exit(1);
}
'

# 未適用の一覧。確認の前は読み取り専用のまま（SOTETSU_PROD_MIGRATION は外す）
echo
echo "== migration:show =="
if ! show_output=$(env -u SOTETSU_PROD_MIGRATION npm run --silent dotenv:prod -- npm run --silent typeorm -- migration:show -d "$DATA_SOURCE" 2>&1); then
    echo "$show_output" >&2
    echo "migration:show に失敗したので中止する" >&2
    exit 1
fi
echo "$show_output"

# migration:show は適用済みを [X]、未適用を [ ] で出す（行頭に色の制御文字が付くので落としてから数える）
pending=$(sed -E 's/\x1b\[[0-9;]*m//g' <<<"$show_output" | grep -cE '^\s*\[ \]' || true)
echo
if [[ "$pending" -eq 0 ]]; then
    echo "未適用の migration は 0 件。何もしない"
    exit 0
fi

echo "未適用の migration: ${pending} 件（上の [ ] の行）。本番 DB に書き込む"
read -r -p "本番に migration:run を流す場合は yes と入力: " answer || answer=""
if [[ "$answer" != "yes" ]]; then
    echo "yes 以外なので何もせず終わる"
    exit 0
fi

SOTETSU_PROD_MIGRATION=confirmed npm run dotenv:prod -- npm run typeorm -- migration:run -d "$DATA_SOURCE"
