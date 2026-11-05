// 標準入力の `DATABASE_URL=...` の行から、シェルで eval できる PG* の代入を出す（値は呼び出し側が出さない）。
// 使い方: grep '^DATABASE_URL=' .env.local.prod | node db/scripts/lib-parse-url.mjs
let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) {
    input += chunk;
}

const raw = input
    .trim()
    .replace(/^DATABASE_URL=/, '')
    .replace(/^(["'])(.*)\1$/, '$2');

let url;
try {
    url = new URL(raw);
} catch {
    process.exit(1);
}

const quote = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`;
const pairs = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1) || 'postgres',
};
console.log(
    Object.entries(pairs)
        .map(([key, value]) => `export ${key}=${quote(value)}`)
        .join('\n'),
);
