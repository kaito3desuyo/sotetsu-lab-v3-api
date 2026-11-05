<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest
  
  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications, heavily inspired by <a href="https://angular.io" target="blank">Angular</a>.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://api.travis-ci.org/nestjs/nest.svg?branch=master" alt="Travis" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://img.shields.io/travis/nestjs/nest/master.svg?label=linux" alt="Linux" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#5" alt="Coverage" /></a>
<a href="https://gitter.im/nestjs/nestjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge"><img src="https://badges.gitter.im/nestjs/nestjs.svg" alt="Gitter" /></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec"><img src="https://img.shields.io/badge/Donate-PayPal-dc3d53.svg"/></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## 手元の開発環境

手元の api・backend・socket は、本番ではなく **手元に立てた Supabase（Postgres 15 と Auth）** につなぐ。手元の画面で投稿や時刻表の編集をしても、本番には何も入らない。決めた経緯は [ADR-0015](docs/adr/0015-dev-db-separation.md)。

```
client (:4200) ─┬─ backend (:3011) ─┐
                ├─ api (:3000) ─────┼─ 手元の Supabase（API :54321 / DB :54322 / Studio :54323）
                └─ socket (:3021) ──┘
```

- 手元の Supabase は Supabase CLI（npm の `supabase` を版固定。`npx supabase`）で docker に立てる。設定は `supabase/config.toml`。
- api の接続先は `.env.local`。コンテナからは `host.docker.internal` で手元の Supabase に届く（`docker-compose.yml` の `extra_hosts`）。
- backend は `.env`（serverless-offline-ssm が読む）に手元の Supabase の URL と鍵を入れる。socket は `.env.local` の `SUPABASE_URL` を `http://127.0.0.1:54321` にする。手順は各リポの README: [backend](../sotetsu-lab-v3-backend/README.md)・[socket](../sotetsu-lab-v3-socket/README.md)・[client](../sotetsu-lab-v3-client/README.md)。

### 初回（clone した直後）

docker が動いていること。

1. `npm install`
2. `.env.local` を作る: `cp .env.local.example .env.local`（手元の Supabase の既定の値が入っている。秘密の値は無い）
3. 本番の接続情報を `.env.local.prod` に置く: `cp .env.local.prod.example .env.local.prod` して `DATABASE_URL`（本番の Supabase の接続文字列）を入れる。**使うのは写し直しと本番への migration の script だけ**。手元の api はこの値では起動しない。以前の `.env.local` が本番を向いていたなら、それを `.env.local.prod` に移して、`.env.local` は手順 2 で作り直す
4. JWT の署名鍵を作る（git 管理外の `supabase/signing_keys.json`。無いと `supabase start` が失敗する。1 回だけ）:
   ```bash
   echo '[]' > supabase/signing_keys.json
   npx supabase gen signing-key --algorithm ES256 --append
   ```
   本番の JWKS に合わせて ES256（非対称鍵）。ファイルが先に無いと `gen signing-key` が `GenSigningKeyReadError` で落ちるので、`[]` を先に置く。鍵は秘密なのでコミットしない（`supabase/.gitignore` で除外済み）
5. 手元の Supabase を立てる: `npm run supabase:start`（初回は image の取得で 1 分ほど。止めるのは `npm run supabase:stop`）
6. 本番から公共のデータを写す: `npm run db:copy-from-prod`（**約 1 分**。2026-11-05 に 54〜60 秒、4 回計測。表の一覧とスキーマの比べまで含む）
7. `docker compose up`（api・backend・client は今までどおり。backend は先に [backend の README](../sotetsu-lab-v3-backend/README.md) の「手元の接続先」を済ませる）

2 回目以降は、手元の Supabase が止まっていたら `npm run supabase:start` を流して `docker compose up` するだけ。

### 本番のデータを写し直す

`npm run db:copy-from-prod`。本番の公共のデータ（時刻表・運用・編成・駅・目撃など）を手元に取り直し、手元の DB を作り直す。本番へは**読み取りだけ**（`pg_dump` と `BEGIN READ ONLY` で包んだ `psql`。`SET` などセッションの状態を変える文は送らない）。

- 手元の DB は作り直すので、手元で書いたものは消える。取り出しの途中で失敗しても、手元には触れない。作り直しの途中で止まったら、もう一度流せば取り直す。
- 写す表は `db/scripts/copy-from-prod.tables.txt` に列挙してある。利用者に結びつくもの（`auth.*` の中身・`profiles`・目撃の投稿者の記録・投稿管理の記録・手がかりの記録・役割の変更記録）は写さない。本番に表が増えて一覧に無いときは、最後に知らせる。
- 最後に本番と手元のスキーマを比べ、差が 0 なら「スキーマの差 0」と出す（単独でも `npm run db:compare-schema`。差があっても止めない）。
- 本番のダンプは `.context/copy-from-prod/` に置き、終わったら消す。

### 試験アカウント

写し直しのたびに作り直される。手元専用の固定値。

| 役割 | ユーザー名 | 投稿 | 時刻表の編集 |
|---|---|---|---|
| reporter | `dev-reporter` | できる | できない（403） |
| editor | `dev-editor` | できる | できる |
| manager | `dev-manager` | できる | できる |
| viewer（BAN 済み） | `dev-viewer` | できない（403） | できない（403） |
| ゲスト | 匿名ログイン | 登録制②の前（フラグ off）はできる | できない（403） |

パスワードはどれも `Dev-password1!`。メールは `dev-<役割>@users.sotetsu-lab.invalid`。backend の `/api/auth/login` はユーザー名を渡す（`dev-reporter` など。backend が `@users.sotetsu-lab.invalid` を付ける）。

### 本番につながらない仕組み

- 本番の DB を向いた `DATABASE_URL` では、手元の api・CLI（`npm run cli`）・TypeORM の CLI（migration など）は**起動を止める**（Lambda の外のとき。`NODE_ENV=production` を付けても止まる）。読み取り専用で立つ形にはしていない。
- `DATABASE_URL` と `SUPABASE_URL` の向き（手元 / 本番）が食い違っても起動しない。
- 起動時のログに向き先が出る: `DB: 手元 / Auth: 手元`。
- 手元の既定では CDN の失効（`CDN_DISTRIBUTION_ID` が空）は呼ばず、socket への合図は手元の serverless-offline に送る。
- 本番の pooler（Supavisor）に `SET` などセッションの状態を変える文を投げない。共有の裏 backend に設定が残り、本番の api を巻き込んだことがある（ADR-0015）。

### 本番へ migration を流す

本番へ書ける口はこれだけ。新しい migration は、まず手元で `npm run migration:run` して確かめてから本番へ流す。

```bash
npm run migration:show:prod   # 接続先と migration の一覧を見るだけ（本番には書かない）
npm run migration:run:prod    # 接続先と未適用の一覧を見せ、yes と打ったときだけ流す
```

`migration:run:prod` は対話端末でないと動かず（yes を流し込めない）、未適用が 0 件なら何もしない。`SOTETSU_PROD_MIGRATION` を外から渡しても動かない（この script の中でだけ付ける）。`migration:revert` を本番に流す口は無い。

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

  Nest is [MIT licensed](LICENSE).
