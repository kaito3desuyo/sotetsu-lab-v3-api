# NestJS 12 化と ESM 化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** api を NestJS 12・TypeScript 6 に上げ、依存を最新にし、CommonJS から ESM（`.js` 付き import）に切り替える。v3 の振る舞いは変えない。

**Architecture:** 段 1 で CommonJS のまま依存と設定を上げ、本番と突き合わせて確かめる。段 2 でテストを Vitest に替えてから `"type": "module"` に切り替え、もう一度全部確かめる。ビルドは今と同じ `nest build`（tsc）で、出力は `dist/main.js`。

**Tech Stack:** NestJS 12・TypeScript 6.0・TypeORM 0.3・Express 5・Vitest 5＋unplugin-swc・@swc-node/register・eslint 10（flat config）・osls 4

**Spec:** docs/superpowers/specs/2026-10-21-nestjs-12-and-esm-design.md

## Global Constraints

- 対象は sotetsu-lab-v3-api のみ。ブランチは `build/nestjs-12`
- v3 の URL・応答の中身・Cache-Control・認証（AuthGuard・RBACGuard）・DB のスキーマ・Lambda の構成（handler `dist/run.sh`・レイヤー・環境変数）は変えない
- helmet が付けるヘッダーだけは helmet 8 の既定に従ってよい（変わったものは PR に一覧で書く）
- TypeScript は `~6.0.3`（typescript-eslint 8.72 が `<6.1.0`、ts-jest が `<7`、`@nestjs/schematics` 12 が `>=6.0.0` を求める）
- `@types/node` は 24 系（Node は mise.toml の 24.22.0。26 にはしない）
- typeorm は 0.3 のまま（1.x は別 spec）
- Node は手元・CI・Lambda とも 24（`require(esm)` と Jest の ESM 読み込みに 24.9 以上が要る）
- ローカルの api は本番 DB を読む。書き込みテストは渋谷工事臨時ダイヤ（calendar_id `27792766-0031-4b89-9c32-23eea267cbbc`）だけで、列番は `9997T`（`9998T`・`9999T` は前回のテストの残りがまだ DB にある）
- コミットは GPG 署名つき・サンドボックス外で行い、`git log -1 --format='%h %G? %s'` で `G` を確かめる。npm の通信は `allowed_domains: registry.npmjs.org`、npm のキャッシュは `npm_config_cache="$TMPDIR/npm-cache"`
- 複数行のインラインスクリプトは hook に止められる。スクリプトは `.context/` に書いてから流す（`.context/` は gitignore 済み）
- コミットの型: 版が major（v5.0.0）なので、NestJS 12 に上げるコミットと ESM に切り替えるコミットに `!` と `BREAKING CHANGE:` を付ける（2026-10-21 に取り消し: 版は patch v4.0.1 に改め、`!` と BREAKING CHANGE は外した）
- コミットメッセージの末尾に次の 2 行を付ける
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`

## Review Focus

- CommonJS のパッケージからの名前付き import（`import { isEqual } from 'lodash'` など）は、tsc を通っても ESM の Node で実行時に `SyntaxError: Named export ... not found` で落ちる → Task 8 の `smoke_import_dist.mjs` が dist の全ファイルを Node で import して捕まえる
- エンティティの循環 import とデコレータのメタデータが重なると、ESM では起動時に `Cannot access 'X' before initialization` で落ちる。Vitest（SWC 変換）では再現しないことがある → Task 8 の smoke と Task 9 の起動で、実物の Node で確かめる
- デプロイ物は `dist/**` だけで、ルートの `package.json` が入らない。`"type": "module"` が効かないと Lambda で `dist/main.js` が CommonJS として読まれて落ちる → Task 8 で `dist/package.json` を書き、Task 9 で `serverless package` の zip の中身を確かめる
- Express 5 の既定のクエリ解析（`simple`）で、配列や入れ子のクエリの解釈が変わる → Task 6・Task 9 の 65 本の突き合わせで確かめ、差が出たら `app.set('query parser', 'extended')` を足す
- エラーの返答に `Cache-Control: no-store` を付けるミドルウェアが、Express 5 のパス書式の変更で効かなくなる → Task 1 で先にテストを書いて守る

---

## 段 1 — CommonJS のまま上げる

### Task 0: 基準を取る

**Files:**
- Create: `.context/baseline/`（gitignore 済みの .context 配下）

**Interfaces:**
- Produces: `.context/baseline/prod_headers.txt`（本番の v3 の応答ヘッダー）・`.context/baseline/load.txt`（読み込み時間）・`.context/lint_baseline.json`（lint 0 件）

- [ ] **Step 1: 本番の応答ヘッダーを残す**

`.context/capture_headers.sh` を書く。

```bash
#!/usr/bin/env bash
# 指定した基点（本番か手元）の v3 の代表 3 本の応答ヘッダーを、日付など毎回変わる行を除いて出す
# 使い方: capture_headers.sh <base-url> <出力ファイル>
set -eu
base="$1"; out="$2"
TOKEN=$(curl -s https://v3.sotetsu-lab.com/api/auth/token | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])')
: > "$out"
for path in /v3/agencies /v3/trip-classes /health-check; do
  echo "== $path" >> "$out"
  curl -s -o /dev/null -D - -H "x-sotetsu-lab-authorization: Bearer $TOKEN" "$base$path" \
    | tr -d '\r' \
    | grep -viE '^(date|x-amzn|x-amz-cf|via|x-cache|etag|content-length|age|alt-svc|x-amzn-remapped)' \
    | sort >> "$out"
done
echo "written $out"
```

Run: `mkdir -p .context/baseline && bash .context/capture_headers.sh https://api.sotetsu-lab.com .context/baseline/prod_headers.txt`（サンドボックス外）
Expected: `written .context/baseline/prod_headers.txt`。中に `content-security-policy`・`cross-origin-embedder-policy: require-corp`・`cache-control` がある

- [ ] **Step 2: 読み込み時間の基準を残す**

Run: `npm run build && SUPABASE_URL=https://dummy.invalid bash .context/measure_load.sh dist/app.module.js 15 | tee .context/baseline/load.txt`
Expected: `require だけの中央値` が 400〜500 ms 前後（2026-10-21 は 431.5 ms）

- [ ] **Step 3: lint の基準を確かめる**

Run: `bash .context/esm_import_survey.sh`
Expected: 最後に `total 0`

コミットは無し（基準は .context に置くだけ）。

---

### Task 1: NestJS 12・TypeScript 6・Jest 30・nestjs-pino 5 に上げる

**Files:**
- Create: `src/core/modules/cache-control/cache-control.module.spec.ts`
- Modify: `package.json`・`package-lock.json`・`tsconfig.json`・`tsconfig.build.json`・`src/core/modules/cache-control/cache-control.module.ts`・`CLAUDE.md`

**Interfaces:**
- Produces: TS 6・nodenext の tsconfig（`paths: { "src/*": ["./src/*"] }`）。Task 2 以降はこの tsconfig を前提にする

- [ ] **Step 1: エラーの返答に no-store が付くことを守るテストを書く**

`src/core/modules/cache-control/cache-control.module.spec.ts`

```ts
import { Controller, Get, INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CacheControl } from './cache-control.decorator';
import { CACHE_CONTROL } from './cache-control.constants';
import { CacheControlModule } from './cache-control.module';

@Controller('probe')
class ProbeController {
    @Get('ok')
    @CacheControl(CACHE_CONTROL.MASTER)
    ok(): { ok: boolean } {
        return { ok: true };
    }

    @Get('ng')
    @CacheControl(CACHE_CONTROL.MASTER)
    ng(): never {
        throw new NotFoundException();
    }
}

describe('CacheControlModule', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [ProbeController],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('成功の返答には @CacheControl の値を付ける', async () => {
        const res = await request(app.getHttpServer()).get('/probe/ok');
        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe(CACHE_CONTROL.MASTER);
    });

    it('エラーの返答には no-store を付ける', async () => {
        const res = await request(app.getHttpServer()).get('/probe/ng');
        expect(res.status).toBe(404);
        expect(res.headers['cache-control']).toBe('no-store');
    });

    it('どのコントローラーにも無いパスでも no-store を付ける', async () => {
        const res = await request(app.getHttpServer()).get('/no/such/path');
        expect(res.status).toBe(404);
        expect(res.headers['cache-control']).toBe('no-store');
    });
});
```

`CacheControl` デコレータと `CACHE_CONTROL` の名前は `cache-control.decorator.ts`・`cache-control.constants.ts` を開いて合わせる（違えばテスト側を直す）。

- [ ] **Step 2: 今の版で通ることを確かめる（守るためのテスト）**

Run: `npx jest src/core/modules/cache-control/cache-control.module.spec.ts`
Expected: 3 件 PASS。落ちたらテストの前提（名前・既定のヘッダー）を直してから進む。これは上げる前の振る舞いを固定するテストなので、ここで通るのが正しい

- [ ] **Step 3: 依存を上げる**

`.context/task1_install.sh` を書いて流す（サンドボックス内・`allowed_domains: registry.npmjs.org`）。

```bash
#!/usr/bin/env bash
# Task 1: NestJS 12 と、それに引きずられる依存を上げる。swagger は使っていないので外す
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm uninstall @nestjs/swagger
npm install \
  @nestjs/common@^12.2.0 @nestjs/core@^12.2.0 @nestjs/platform-express@^12.2.0 @nestjs/typeorm@^12.0.2 \
  nestjs-pino@^5.3.1 pino-http@^11.0.0 pino@^10.4.0 nest-commander@^3.21.0 rxjs@^7.8.2
npm install -D \
  @nestjs/cli@^12.0.10 @nestjs/schematics@^12.0.10 @nestjs/testing@^12.2.0 \
  typescript@~6.0.3 jest@^30.5.2 @types/jest@^30.0.0 ts-jest@^29.4.15 \
  @types/node@^24 @types/express@^5
npm ls @nestjs/core typescript jest nestjs-pino pino-http
```

Run: `bash .context/task1_install.sh`
Expected: 最後の `npm ls` に `@nestjs/core@12.x`・`typescript@6.0.x`・`jest@30.x`・`nestjs-pino@5.x`・`pino-http@11.x` が出て、`UNMET PEER` や `invalid` が無い。`rxjs` がもともと入っていなければ peer として足される

- [ ] **Step 4: tsconfig を TS 6 に合わせる**

`tsconfig.json`

```json
{
    "compilerOptions": {
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "resolvePackageJsonExports": true,
        "declaration": true,
        "removeComments": true,
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "target": "ES2023",
        "sourceMap": true,
        "outDir": "./dist",
        "paths": {
            "src/*": ["./src/*"]
        },
        "types": ["node", "jest"],
        "incremental": true,
        "resolveJsonModule": true,
        "esModuleInterop": true,
        "skipLibCheck": true
    },
    "exclude": ["db/backup/**", "db/oldSeedMigration/**", "db/seeds/**"],
    "ts-node": {
        "require": ["tsconfig-paths/register"]
    }
}
```

`tsconfig.build.json`

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "rootDir": "./src"
    },
    "exclude": [
        "node_modules",
        "test",
        "dist",
        "**/*spec.ts",
        "serverless.ts",
        "db"
    ]
}
```

- [ ] **Step 5: Express 5 のパス書式に直す**

`src/core/modules/cache-control/cache-control.module.ts` の

```ts
        consumer.apply(noStoreOnError).forRoutes('*');
```

を

```ts
        consumer.apply(noStoreOnError).forRoutes('{*splat}');
```

にする。

- [ ] **Step 6: 型・ビルドを通す**

Run: `npx tsc --noEmit -p tsconfig.json > .context/task1_tsc.log 2>&1; echo $?; head -50 .context/task1_tsc.log`
Expected: `0`。エラーが出たら 1 つずつ直す。よく出るもの:
- `TS2307 Cannot find module 'src/...'` → tsconfig の `paths` の書き間違い
- NestJS 11・12 で型が締まった所（`PipeTransform` の引数、`Reflector.get` の戻り値など）→ 呼び出し側の型を合わせる。振る舞いは変えない
- `@types/express` 5 で `Request`・`Response` の型が変わった所 → 型注釈だけ直す

Run: `npm run build && ls dist/main.js dist/run.sh`
Expected: 両方ある（`dist/src/main.js` になっていない）

- [ ] **Step 7: NestJS の移行ガイドの「自動で移せない変更」を当てはめる**

`npx nest upgrade --dry-run > .context/task1_nest_upgrade.log 2>&1` を流し（サンドボックス内・registry 許可）、出力の notes（ライフサイクルフックの順・パイプの型・ログの params）を読む。

- `onModuleInit`・`onApplicationBootstrap`・`enableShutdownHooks` の順に頼る所があれば直す（`grep -rn "onModuleInit\|onApplicationBootstrap\|onModuleDestroy\|beforeApplicationShutdown\|onApplicationShutdown" src '--include=*.ts'` で探す）
- `ConsoleLogger` の構造化ログは使っていない（ログは nestjs-pino）ので対象外
- 当てはまる所が無ければ、ログを読んで「無し」と ledger に書く

- [ ] **Step 8: テスト全件**

Run: `npx jest > .context/task1_jest.log 2>&1; echo $?; grep -E "^Tests:|^Test Suites:" .context/task1_jest.log`
Expected: `0`、全 PASS（Step 1 の 3 件を含む）

- [ ] **Step 9: 手元で起動する**

Run: `SUPABASE_URL=https://dummy.invalid timeout 20 node dist/main.js > .context/task1_boot.log 2>&1; grep -E "Nest application successfully started|Error" .context/task1_boot.log | head`
Expected: DB に繋がらないので最終的には落ちてよいが、`Cannot find module`・`ERR_REQUIRE_ESM`・DI のエラー（`Nest can't resolve dependencies`）が出ない

- [ ] **Step 10: CLAUDE.md の技術スタックを直す**

`CLAUDE.md` の

```
- **フレームワーク** - NestJS 10.x / TypeScript 4.7
```

を

```
- **フレームワーク** - NestJS 12.x / TypeScript 6.0
```

にし、`- **API ドキュメント** - Swagger` の行を消す。

- [ ] **Step 11: Commit**

`.context/task1_commit_msg.txt`

```
build!: :arrow_up: NestJS 12 と TypeScript 6 に上げる

Jest 30・nestjs-pino 5（pino-http 11・pino 10）も上げる。使っていない @nestjs/swagger を外す。
tsconfig を nodenext・paths・rootDir に直し、Express 5 の書式で forRoutes('{*splat}') にする。

BREAKING CHANGE: NestJS 12（Express 5）と TypeScript 6 に上げた。
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
```

```bash
git add package.json package-lock.json tsconfig.json tsconfig.build.json CLAUDE.md src
git diff --cached --stat
git commit -q -S -F .context/task1_commit_msg.txt
git log -1 --format='%h %G? %s'
```

Expected: `G`

---

### Task 2: ts-node をやめ、CLI・migration・seed を SWC で流す

**Files:**
- Modify: `package.json`・`src/cli.ts`・`tsconfig.json`（`ts-node` の節を消す）

**Interfaces:**
- Consumes: Task 1 の tsconfig
- Produces: npm script の `cli`・`migration:*`・`seed:*` が `node -r @swc-node/register` で動く。Task 8 で `--import @swc-node/register/esm-register` に替える

> Spec 4 章は「CLI と migration は dist から流す」としているが、migration のファイル（`db/migrations/*.ts`）は build の対象外で dist に入らない。CLI・migration・seed を同じ SWC の loader で流すほうが一つの仕組みで済むので、そうする（ledger に Ruling を書く）。

- [ ] **Step 1: 今 CLI が壊れていることを確かめる（失敗の再現）**

Run: `npm run cli -- --help > .context/task2_cli_before.log 2>&1; echo $?; tail -5 .context/task2_cli_before.log`
Expected: 0 以外。`express.d` の import か ts-node の TS 6 非対応で落ちる

- [ ] **Step 2: 依存を入れ替える**

```bash
#!/usr/bin/env bash
# Task 2: ts-node と tsconfig-paths をやめ、@swc-node/register で TS を流す
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm uninstall ts-node tsconfig-paths
npm install -D @swc-node/register@^1.12.1 @swc/core@^1.16.18
```

（`.context/task2_install.sh` に書いて流す。サンドボックス内・registry 許可）

- [ ] **Step 3: `src/cli.ts` から型だけのファイルの import を消す**

`src/cli.ts` の 1 行目

```ts
import './core/types/express.d';
```

を消す。`express.d.ts` は tsconfig の対象に入っているので、型は tsc がそのまま読む。

- [ ] **Step 4: npm script を書き換える**

`package.json` の `scripts` を次にする（変える行だけ）。

```json
        "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
        "typeorm": "node -r @swc-node/register ./node_modules/typeorm/cli.js",
        "cli": "npm run dotenv -- node -r @swc-node/register src/cli.ts",
        "seed:calendar-dates:holidays": "npm run dotenv -- node -r @swc-node/register db/seeds/seed-calendar-dates-holidays.ts",
        "seed:calendar-dates:special": "npm run dotenv -- node -r @swc-node/register db/seeds/seed-calendar-dates-special.ts",
        "seed:calendar-dates:newyear": "npm run dotenv -- node -r @swc-node/register db/seeds/seed-calendar-dates-newyear.ts"
```

`migration:*` は `npm run typeorm -- …` を呼んでいるのでそのまま。`tsconfig.json` の `"ts-node"` の節を消す。

`src/…` の import を SWC が解決するよう、`.swcrc` は置かず tsconfig の `paths` を読ませる（@swc-node/register は既定で tsconfig を読む）。解決できなければ環境変数 `SWC_NODE_PROJECT=./tsconfig.json` を script に足す。

- [ ] **Step 5: CLI が起動することを確かめる**

Run: `npm run cli -- --help > .context/task2_cli_after.log 2>&1; echo $?; tail -15 .context/task2_cli_after.log`（サンドボックス外。`.env.local` を dotenvx が読む）
Expected: `0`。`rebuildLatestCache` を含むヘルプが出る。DI のエラーが無い

- [ ] **Step 6: migration の生成が差分なしで終わることを確かめる**

Run: `npm run migration:generate -- db/migrations/NoopCheck > .context/task2_mig.log 2>&1; echo $?; tail -5 .context/task2_mig.log`（サンドボックス外。Supabase の DNS はサンドボックス内で引けない）
Expected: `No changes in database schema were found` が出る。ファイルが作られていない（`git status --short db/migrations` が空）

- [ ] **Step 7: seed が読み込みまで進むことを確かめる**

`db/seeds/seed-calendar-dates-holidays.ts` を開き、引数なしで何をするかを読む。書き込みが走るなら流さない。代わりに読み込みだけ確かめる:

Run: `node -r @swc-node/register -e "require('./db/seeds/seed-calendar-dates-holidays.ts')" > .context/task2_seed.log 2>&1 || true; grep -E "Cannot find module|SyntaxError|TypeError" .context/task2_seed.log`

読み込んだ時点で本体が走る作りの場合は、この Step を流す前に seed の入口（`main()` の呼び出し）が `require.main === module` などで守られているかを見て、守られていなければ Step を飛ばし、ledger に「seed は読み込みで実行されるため Task 9 で `--dry-run` 相当が無いことを記録」と書く。
Expected: `Cannot find module`・`SyntaxError` が無い

- [ ] **Step 8: テストと型**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest > .context/task2_jest.log 2>&1; echo $?; grep -E "^Tests:" .context/task2_jest.log`
Expected: `0`・全 PASS

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/cli.ts
git diff --cached --stat
git commit -q -S -m "build: :wrench: ts-node をやめ CLI・migration・seed を SWC で流す

壊れていた npm run cli（src/cli.ts の express.d の import）も直る。

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

---

### Task 3: NestJS に引きずられない依存を上げる

**Files:**
- Modify: `package.json`・`package-lock.json`・`patches/`（要るときだけ）・helmet・uuid・class-validator の使い方が変わった所

- [ ] **Step 1: 上げる**

`.context/task3_install.sh`（サンドボックス内・registry 許可）

```bash
#!/usr/bin/env bash
# Task 3: NestJS に引きずられない依存を上げる（typeorm と osls と eslint は除く）
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm install \
  helmet@^8.3.0 class-validator@^0.15.1 reflect-metadata@^0.2.2 uuid@^14.0.3 \
  pg@^8.23.1 jose@^6.2.13 lodash@^4.18.1 dayjs@latest compression@latest on-headers@latest \
  just-clone@latest just-omit@latest just-pick@latest pluralize@latest ts-custom-error@latest class-transformer@latest
npm install -D \
  @dotenvx/dotenvx@^2.38.2 pino-pretty@^13.2.0 prettier@^3.9.10 supertest@^7.3.1 @types/supertest@^7.2.1 \
  rimraf@^6.1.3 typesync@^0.14.3 patch-package@latest \
  @types/compression@latest @types/lodash@latest @types/pg@latest @types/pluralize@latest @types/serverless@latest \
  @types/on-headers@latest @types/eslint@latest
npm uninstall @types/uuid @types/prettier @types/eslint-config-prettier
npm outdated || true
```

`@types/uuid` は uuid 10 以降が型を同梱するので外す。`@types/prettier` は prettier 3 が型を同梱するので外す。`@types/eslint-config-prettier` は Task 4 で要らなくなる。
Expected: `npm outdated` に残るのは typeorm・osls・eslint 系・`@serverless/typescript`・serverless 系プラグイン・`@types/node`（24 に留めるため）だけ

- [ ] **Step 2: patch を確かめる**

`@serverless/typescript` は Task 5 で上げるので、ここでは `npm ci` 後に `patch-package` が警告無しで当たることだけ見る。
Run: `npx patch-package 2>&1 | tail -3`
Expected: `@serverless/typescript@4.27.1 ✔`

- [ ] **Step 3: 型とテスト**

Run: `npx tsc --noEmit -p tsconfig.json > .context/task3_tsc.log 2>&1; echo $?; head -30 .context/task3_tsc.log`
Expected: `0`。出たら直す。よく出るもの:
- uuid 14 は ESM 専用で `v4` の名前は同じ。CJS の今は `require(esm)` で読めるので import の書き方は変えない
- class-validator 0.15 で型が締まった所 → DTO の型注釈だけ直す

Run: `npx jest > .context/task3_jest.log 2>&1; echo $?; grep -E "^Tests:" .context/task3_jest.log`
Expected: `0`・全 PASS

- [ ] **Step 4: helmet 8 で変わるヘッダーを見る**

手元の api を起動し直す（Task 6 Step 1 の手順で開発コンテナを作り直す）。
Run: `bash .context/capture_headers.sh http://localhost:3000 .context/task3_local_headers.txt && diff .context/baseline/prod_headers.txt .context/task3_local_headers.txt > .context/task3_header_diff.txt; cat .context/task3_header_diff.txt`
Expected: 差は helmet が付けるヘッダー（`cross-origin-embedder-policy`・`content-security-policy`・`x-xss-protection` など）と CloudFront が付けるもの（本番だけにある）だけ。`cache-control`・`access-control-*` に差が無い。差の一覧は PR 本文に貼る

- [ ] **Step 5: dotenvx 2 で `.env.local` が読めることを確かめる**

Run: `npm run dotenv -- node -e "console.log(Boolean(process.env.DATABASE_URL), Boolean(process.env.SUPABASE_URL))"`（サンドボックス外）
Expected: `true true`（値そのものは出さない）

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src patches
git diff --cached --stat
git commit -q -S -m "build: :arrow_up: NestJS に関係しない依存を上げる

helmet 8・class-validator 0.15・reflect-metadata 0.2・uuid 14・dotenvx 2・pino-pretty 13 ほか。
型を同梱するようになった @types/uuid・@types/prettier を外す。

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

---

### Task 4: eslint 10 の flat config に移す

**Files:**
- Create: `eslint.config.mjs`
- Delete: `.eslintrc.json`
- Modify: `package.json`

- [ ] **Step 1: 上げる**

`.context/task4_install.sh`（サンドボックス内・registry 許可）

```bash
#!/usr/bin/env bash
# Task 4: eslint 10 と typescript-eslint の flat config 用パッケージに入れ替える
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser @types/eslint-config-prettier
npm install -D eslint@^10.13.0 typescript-eslint@^8.72.0 eslint-config-prettier@^10.1.8 globals@^17.13.0
```

- [ ] **Step 2: flat config を書く**

`eslint.config.mjs`

```js
// @ts-check
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {
        ignores: ['dist/**', 'coverage/**', 'db/**', 'node_modules/**'],
    },
    tseslint.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: { ...globals.node, ...globals.jest },
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
);
```

`@typescript-eslint/interface-name-prefix` は typescript-eslint 8 に無い規則なので書かない（flat config では無い規則を書くとエラーになる）。

- [ ] **Step 3: 古い設定を消す**

Run: `git rm -q .eslintrc.json`

- [ ] **Step 4: 指摘の件数を比べる**

Run: `npx eslint "{src,apps,libs,test}/**/*.ts" -f json -o .context/lint_after.json > /dev/null 2>&1; python3 .context/lint_count.py .context/lint_after.json`
Expected: `total 0`（Task 0 と同じ）。新しく出た指摘は、eslint 10・typescript-eslint 8.72 の recommended に増えた規則によるもの。規則の名前を ledger に書き、コードを直して 0 にする（規則を off にはしない）

規則が効いていることを確かめるため、わざと違反を 1 つ作って捕まるかを見る:
Run: `printf 'const unused = 1;\n' > src/__lint_probe.ts && npx eslint src/__lint_probe.ts; echo $?; rm src/__lint_probe.ts`
Expected: `@typescript-eslint/no-unused-vars` で 1 件、終了コード 1

- [ ] **Step 5: npm run lint**

Run: `npm run lint > .context/task4_lint.log 2>&1; echo $?`（サンドボックス外。client では中だと動かなかった）
Expected: `0`。`git status --short` に lint の自動修正による変更が出ていない（出たら中身を見て、整形だけならこのコミットに含める）

- [ ] **Step 6: Commit**

```bash
git add -A eslint.config.mjs .eslintrc.json package.json package-lock.json
git diff --cached --stat
git commit -q -S -m "build: :wrench: eslint 10 の flat config に移す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

---

### Task 5: osls 4 に上げる

**Files:**
- Modify: `package.json`・`package-lock.json`・`serverless.ts`（要るときだけ）・`patches/`

- [ ] **Step 1: 上げる**

`.context/task5_install.sh`（サンドボックス内・registry 許可）

```bash
#!/usr/bin/env bash
# Task 5: osls 4 とプラグイン・@serverless/typescript を最新にする
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm install -D osls@^4.4.0 serverless-layers@^2.8.5 serverless-plugin-warmup@^8.4.1 \
  serverless-deployment-bucket@^1.6.0 @serverless/typescript@^4.30.0
npx patch-package 2>&1 | tail -3
```

Expected: `@serverless/typescript` の patch が当たらない（版が変わった）と出たら Step 2 へ。当たれば Step 3 へ

- [ ] **Step 2: patch を見直す**

`patches/@serverless+typescript+4.27.1.patch` を開き、何を直していたかを読む。4.30.0 の同じ所を見て、
- 直っていれば patch を消す（`git rm patches/@serverless+typescript+4.27.1.patch`）
- 直っていなければ 4.30.0 に同じ変更を手で当て、`npx patch-package @serverless/typescript` で作り直し、古い patch を消す

- [ ] **Step 3: 型を確かめる**

Run: `npx tsc --noEmit serverless.ts --module nodenext --moduleResolution nodenext --skipLibCheck --esModuleInterop; echo $?`
Expected: `0`

- [ ] **Step 4: パッケージを作る**

Run: `npm run build && npx serverless package --stage prod > .context/task5_package.log 2>&1; echo $?; tail -20 .context/task5_package.log`（サンドボックス外。`aws-vault` は要らない想定。SSM の値を引くので AWS の認証が要ると出たら、ユーザーに `! aws-vault exec administrator -- npx serverless package --stage prod` を頼む）
Expected: `0`。プラグイン（serverless-layers・deployment-bucket・warmup）のどれかが AWS SDK v2 の API を呼んで落ちたら、
- そのプラグインの最新版で直っているかを npm と GitHub の issue で調べる
- 直っていなければ osls を `^3` に戻し（`npm install -D osls@^3.78.0`）、ledger に「osls 4 はプラグイン X が非対応のため見送り、別 spec」と Ruling を書いてこの Task を終える

Run: `unzip -l .serverless/*.zip | tail -5`
Expected: `dist/` 配下のファイルが入っている

- [ ] **Step 5: Commit**

```bash
git add -A package.json package-lock.json serverless.ts patches
git diff --cached --stat
git commit -q -S -m "build: :arrow_up: osls 4 に上げる

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

---

### Task 6: 段 1 の確かめ

**Files:**
- Create: `.context/verify_stage.sh`

**Interfaces:**
- Produces: `.context/verify_stage.sh <段名>`。Task 9 も同じものを流す

- [ ] **Step 1: 開発コンテナを作り直す**

依存が変わったので、匿名ボリュームの node_modules を作り直す。

```bash
docker compose build development-api
docker compose up -d --renew-anon-volumes development-api
docker exec sotetsu-lab-v3-api-development-api-1 node --version
docker logs --tail 30 sotetsu-lab-v3-api-development-api-1
```

（サンドボックス外。コンテナ名が違えば `docker ps` で確かめる）
Expected: Node が `v24.9` 以上。ログに `Nest application successfully started` があり、`error TS` が無い

- [ ] **Step 2: 確かめのスクリプトを書く**

`.context/verify_stage.sh`

```bash
#!/usr/bin/env bash
# 段の終わりの確かめ（自動でやれる分）。使い方: verify_stage.sh <段名>
# 書き込みテストと目視は別の Step で行う。サンドボックス外で流す
set -u
cd "$(dirname "$0")/.."
stage="$1"
out=".context/verify_${stage}"
mkdir -p "$out"
step() { echo; echo "######## $1"; }

step "1 build・型・テスト・lint"
npm run build > "$out/build.log" 2>&1; echo "build $?"
npx tsc --noEmit -p tsconfig.json > "$out/tsc.log" 2>&1; echo "tsc $?"
npm test > "$out/test.log" 2>&1; echo "test $?"; grep -E "Tests|Test Files" "$out/test.log" | tail -3
npx eslint "{src,apps,libs,test}/**/*.ts" -f json -o "$out/lint.json" > /dev/null 2>&1; python3 .context/lint_count.py "$out/lint.json" | head -3

step "2 dist の形"
ls dist/main.js dist/run.sh

step "3 v3 の GET 65 本の突き合わせ"
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt python3 .context/compare_local_prod.py | tail -5

step "4 目撃 POST が 422"
TOKEN=$(curl -s https://v3.sotetsu-lab.com/api/auth/token | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])')
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -H "x-sotetsu-lab-authorization: Bearer $TOKEN" -d '{}' http://localhost:3000/v3/operation-sightings
unset TOKEN

step "5 /v2 は 404・health-check は 200"
curl -s -o /dev/null -w '/v2/agencies %{http_code}\n' http://localhost:3000/v2/agencies
curl -s -o /dev/null -w '/health-check %{http_code}\n' http://localhost:3000/health-check

step "6 CLI・migration"
npm run cli -- --help > "$out/cli.log" 2>&1; echo "cli $?"; grep -c rebuildLatestCache "$out/cli.log"
npm run migration:generate -- db/migrations/NoopCheck > "$out/mig.log" 2>&1; echo "migration $?"; grep -E "No changes|has been generated" "$out/mig.log"
git status --short db/migrations

step "7 ヘッダー"
bash .context/capture_headers.sh http://localhost:3000 "$out/local_headers.txt" > /dev/null
diff .context/baseline/prod_headers.txt "$out/local_headers.txt" > "$out/header_diff.txt"; cat "$out/header_diff.txt"

step "8 読み込み時間"
SUPABASE_URL=https://dummy.invalid bash .context/measure_load.sh dist/app.module.js 15
cat .context/baseline/load.txt
```

Task 8 で ESM に変わると `dist/app.module.js` を `require` できなくなるので、Task 8 で `measure_load.sh` を ESM 対応にする（そこで書く）。

- [ ] **Step 3: 流す**

Run: `bash .context/verify_stage.sh stage1 > .context/verify_stage1.log 2>&1; cat .context/verify_stage1.log`（サンドボックス外）
Expected:
- 1: `build 0`・`tsc 0`・`test 0`・lint `total 0`
- 2: 両ファイルがある
- 3: `same=` が 65（時刻で変わる口は状態コードだけ一致）。`diff` が出たら、その URL の手元と本番の応答を並べて原因を探す。クエリの解釈の差なら `src/app.ts` の `createApp` で `NestFactory.create` の直後に `app.set('query parser', 'extended')` を足し（型は `NestExpressApplication`）、流し直す
- 4: `422`
- 5: `/v2/agencies 404`・`/health-check 200`
- 6: `cli 0` と 1 以上・`migration 0` と `No changes`・`git status` が空
- 7: 差は helmet のヘッダーと CloudFront 由来のものだけ
- 8: 中央値が基準から +20% 以内

- [ ] **Step 4: 書き込みテスト**

Supabase MCP（読み取り専用）で `select count(*) from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number = '9997T'` が 0 であることを確かめる。

手元の client（`http://localhost:4200`、手元の api を向く）の「列車情報の入力」で、渋谷工事臨時ダイヤに次の順に保存し、どれも成功の知らせが出て、保存後の画面と API の応答が合うことを見る。
1. 新規登録（`9997T`・2 駅以上の時刻）→ `POST /v3/trip-blocks/bulk`
2. 時刻を 1 つ変えて更新 → `PUT /v3/trip-blocks/:id`
3. 全線時刻表から列車の追加と削除 → `PATCH /v3/trip-blocks/:id/add-trip`・`delete-trip`（`.context/patch_trip_test.py` を使ってよい）

Supabase MCP で `9997T` の列車と trip_block の id を引き、後始末の SQL（`trip_operation_lists` → `trips` → `trip_blocks` の順・`9997T` とその trip_block だけ）を ledger に書く。ユーザーには PR 前にまとめて渡す（段 2 でも同じ列番を使うので、段 2 の書き込みテストの後に 1 本で渡す）。

- [ ] **Step 5: 結果を ledger に書く**

コミットは無し。`verify_stage1.log` の要点（65 本の結果・ヘッダーの差・読み込み時間）を ledger に書く。

---

## 段 2 — ESM に切り替える

### Task 7: Jest をやめ Vitest に替える（CommonJS のまま）

**Files:**
- Create: `vitest.config.ts`・`vitest.config.e2e.ts`・`.context/jest_to_vitest.py`
- Delete: `test/jest-e2e.json`
- Modify: `package.json`（`jest` の節と scripts）・`tsconfig.json`（`types`）・`src/test-setup.ts`・`eslint.config.mjs`（globals）・spec 18 ファイル

**Interfaces:**
- Produces: `npm test` が `vitest run`。Task 8 以降のテストはこれで流す

- [ ] **Step 1: 入れ替える**

`.context/task7_install.sh`（サンドボックス内・registry 許可）

```bash
#!/usr/bin/env bash
# Task 7: Jest をやめ Vitest＋SWC に替える
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="$TMPDIR/npm-cache"
npm uninstall jest ts-jest @types/jest
npm install -D vitest@^5.0.5 @vitest/coverage-v8@^5.0.5 unplugin-swc@^2.0.0
```

- [ ] **Step 2: 設定を書く**

`vitest.config.ts`

```ts
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.spec.ts'],
        globalSetup: ['./src/test-setup.ts'],
        coverage: { reportsDirectory: './coverage' },
    },
    resolve: {
        alias: { src: resolve(import.meta.dirname, 'src') },
    },
    plugins: [swc.vite({ module: { type: 'es6' } })],
});
```

`vitest.config.e2e.ts`

```ts
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.e2e-spec.ts'],
        globalSetup: ['./src/test-setup.ts'],
    },
    resolve: {
        alias: { src: resolve(import.meta.dirname, 'src') },
    },
    plugins: [swc.vite({ module: { type: 'es6' } })],
});
```

`src/test-setup.ts`

```ts
// 本番は app.ts / cli.ts で Asia/Tokyo に固定されるため、テストも同じ前提に揃える。
// これを行わないと、実行環境のタイムゾーンによって運行日の判定結果が変わる。
// ワーカー起動前に設定する必要があるため setupFiles ではなく globalSetup で行う。
export default async function setup(): Promise<void> {
    process.env.TZ = 'Asia/Tokyo';
}
```

`package.json`: `"jest": { … }` の節を消し、scripts を次にする（変える行だけ）。

```json
        "test": "vitest run",
        "test:watch": "vitest",
        "test:cov": "vitest run --coverage",
        "test:debug": "vitest --inspect-brk --no-file-parallelism",
        "test:e2e": "vitest run --config vitest.config.e2e.ts",
```

`tsconfig.json` の `"types": ["node", "jest"]` を `"types": ["node", "vitest/globals"]` にする。`eslint.config.mjs` の `...globals.jest` を `...globals.vitest` にする（globals 17 に `vitest` がある。無ければ `describe`・`it`・`expect`・`vi`・`beforeAll`・`afterAll`・`beforeEach`・`afterEach` を `'readonly'` で並べる）。`git rm -q test/jest-e2e.json`。

- [ ] **Step 3: テストが落ちることを確かめる（書き換え前）**

Run: `npx vitest run > .context/task7_before.log 2>&1; echo $?; grep -E "Test Files|Tests|jest is not defined" .context/task7_before.log | head`
Expected: 0 以外。`jest is not defined` で落ちるファイルがある

- [ ] **Step 4: `jest.*` を `vi.*` に書き換える**

`.context/jest_to_vitest.py`

```python
"""spec の jest.* を vitest の vi.* に書き換える。型（jest.Mock・jest.MockedFunction）は vitest から import する。"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CALLS = ['fn', 'spyOn', 'mock', 'clearAllMocks', 'restoreAllMocks', 'resetAllMocks',
         'useFakeTimers', 'useRealTimers', 'setSystemTime', 'advanceTimersByTime']
changed = []
for path in list(ROOT.glob('src/**/*.ts')) + list(ROOT.glob('test/**/*.ts')):
    text = path.read_text()
    orig = text
    for c in CALLS:
        text = re.sub(rf'\bjest\.{c}\b', f'vi.{c}', text)
    types = set()
    if re.search(r'\bjest\.MockedFunction\b', text):
        text = re.sub(r'\bjest\.MockedFunction\b', 'MockedFunction', text)
        types.add('MockedFunction')
    if re.search(r'\bjest\.Mock\b', text):
        text = re.sub(r'\bjest\.Mock\b', 'Mock', text)
        types.add('Mock')
    if types:
        text = f"import type {{ {', '.join(sorted(types))} }} from 'vitest';\n" + text
    if re.search(r'\bjest\.', text):
        print('残り', path.relative_to(ROOT), sorted(set(re.findall(r'\bjest\.\w+', text))))
    if text != orig:
        path.write_text(text)
        changed.append(str(path.relative_to(ROOT)))
print(len(changed), 'files')
```

Run: `python3 .context/jest_to_vitest.py`
Expected: `18 files` 前後。`残り` が出たら、その API の vitest 版（`vi.*`）を CALLS に足して流し直す

`vi.mock` は vitest でもファイルの先頭に巻き上げられる。工場関数の中で外の変数を使っている所があれば、`vi.hoisted` で包む（vitest がエラーで知らせる）。`jest.mock('src/…')` の文字列は `resolve.alias` で解決される。

- [ ] **Step 5: テストを通す**

Run: `npm test > .context/task7_after.log 2>&1; echo $?; grep -E "Test Files|Tests" .context/task7_after.log`
Expected: `0`。Test Files・Tests の件数が Task 2 の Jest の結果（`.context/task2_jest.log` の `Test Suites:`・`Tests:`）と同じ。件数が違えば、拾えていない spec（`include` の漏れ）か、余計に拾ったものを探す

`cache-control.routes.spec.ts` の先頭のコメント「jose（ESM 専用で jest が読めない）」は vitest では当てはまらないが、`SUPABASE_URL` を読む理由が残るので `vi.mock` はそのままにし、コメントの「jest が読めない」を「テストでは SUPABASE_URL が無い」に直す。

- [ ] **Step 6: 型・lint**

Run: `npx tsc --noEmit -p tsconfig.json; echo $?; npx eslint "{src,apps,libs,test}/**/*.ts" -f json -o .context/task7_lint.json > /dev/null 2>&1; python3 .context/lint_count.py .context/task7_lint.json | head -3`
Expected: `0`・`total 0`

- [ ] **Step 7: CI の手順を確かめる**

`.github/workflows/ci.yml` は `npm test` を流すだけなので変えない。

- [ ] **Step 8: Commit**

```bash
git add -A package.json package-lock.json tsconfig.json vitest.config.ts vitest.config.e2e.ts eslint.config.mjs src test
git diff --cached --stat
git commit -q -S -m "test: :white_check_mark: Jest をやめ Vitest に替える

ESM に切り替える前に、テストの道具を先に替える。デコレータのメタデータは unplugin-swc で出す。

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

---

### Task 8: ESM に切り替える

**Files:**
- Create: `.context/rewrite_esm_imports.py`・`.context/wrap_relations.py`・`.context/smoke_import_dist.mjs`
- Modify: `package.json`・`tsconfig.json`・`vitest.config.ts`・`vitest.config.e2e.ts`・`src/**/*.ts`・`test/**/*.ts`・`db/seeds/*.ts`・`db/migrations/*.ts`（import があるものだけ）・`.context/measure_load.sh`

**Interfaces:**
- Consumes: Task 7 の `npm test`（vitest）
- Produces: `"type": "module"`・`dist/package.json`（`{"type":"module"}`）・`.context/smoke_import_dist.mjs`

- [ ] **Step 1: dist の全ファイルを Node で import する smoke を書く**

`.context/smoke_import_dist.mjs`

```js
// dist の .js を 1 本ずつ実物の Node で import し、ESM の読み込みで落ちるもの（名前付き import・循環の初期化前参照・拡張子の欠け）を出す
// 使い方: SUPABASE_URL=https://dummy.invalid node .context/smoke_import_dist.mjs
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..', 'dist');
const skip = new Set(['main.js', 'cli.js']); // 読み込むと listen・コマンド実行が走る
const files = [];
const walk = (dir) => {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith('.js') && !skip.has(name)) files.push(p);
    }
};
walk(root);
let ng = 0;
for (const f of files) {
    try {
        await import(pathToFileURL(f).href);
    } catch (e) {
        ng++;
        console.log(`NG ${f.slice(root.length + 1)}: ${String(e?.message ?? e).split('\n')[0]}`);
    }
}
console.log(`smoke ${files.length - ng}/${files.length} ok`);
process.exit(ng ? 1 : 0);
```

- [ ] **Step 2: `"type": "module"` を足し、smoke が落ちることを確かめる**

`package.json` の `"license": "MIT",` の次の行に `"type": "module",` を足す。

Run: `npm run build > .context/task8_build1.log 2>&1; echo $?; head -20 .context/task8_build1.log`
Expected: 0 以外。`TS2835 Relative import paths need explicit file extensions` が多数出る（nodenext が ESM として扱い始めた証拠）

- [ ] **Step 3: import を書き換えるスクリプトを書く**

`.context/rewrite_esm_imports.py`

```python
"""ESM 化のため、相対 import に .js を付け、'src/…' の import を相対パス（.js 付き）に書き換える。
対象: import/export の from、副作用の import、動的 import()、vi.mock() の文字列。
解決できないものは書き換えずに一覧に出す。"""
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'


def targets():
    out = []
    for g in ('src/**/*.ts', 'test/**/*.ts', 'db/seeds/**/*.ts', 'db/migrations/**/*.ts'):
        for p in ROOT.glob(g):
            if p.name.endswith('.d.ts'):
                continue
            out.append(p)
    return out


PATTERN = re.compile(
    r"""(?P<head>(?:\bfrom\s+|\bimport\s+|\bimport\(\s*|\bvi\.mock\(\s*))(?P<q>['"])(?P<spec>(?:\.{1,2}/|src/)[^'"]*)(?P=q)"""
)


def resolve_spec(file: pathlib.Path, spec: str):
    if spec.startswith('src/'):
        target = SRC / spec[len('src/'):]
    else:
        target = (file.parent / spec)
    target = pathlib.Path(str(target))
    if spec.endswith('.js') or spec.endswith('.json'):
        base = target
        suffix = ''
    elif target.with_name(target.name + '.ts').exists():
        base, suffix = target, '.js'
    elif (target / 'index.ts').exists():
        base, suffix = target / 'index', '.js'
    else:
        return None
    rel = pathlib.Path(os.path.relpath(str(base), str(file.parent))).as_posix()
    if not rel.startswith('.'):
        rel = './' + rel
    return rel + suffix


unresolved = []
changed = 0
for f in targets():
    text = f.read_text()

    def repl(m):
        new = resolve_spec(f, m.group('spec'))
        if new is None:
            unresolved.append(f'{f.relative_to(ROOT)}: {m.group("spec")}')
            return m.group(0)
        return f"{m.group('head')}{m.group('q')}{new}{m.group('q')}"

    out = PATTERN.sub(repl, text)
    if out != text:
        f.write_text(out)
        changed += 1
print(changed, 'files changed')
for u in unresolved:
    print('UNRESOLVED', u)
sys.exit(1 if unresolved else 0)
```

- [ ] **Step 4: 流す**

Run: `python3 .context/rewrite_esm_imports.py > .context/task8_rewrite.log; echo $?; head -3 .context/task8_rewrite.log; grep UNRESOLVED .context/task8_rewrite.log`
Expected: `0`・`300 files changed` 前後・`UNRESOLVED` 無し。出たら、その import が指すファイルを探して手で直す

Run: `grep -rn "from 'src/" src test db/seeds '--include=*.ts' | head`
Expected: 何も出ない

- [ ] **Step 5: `src/*` の paths と alias をやめる**

- `tsconfig.json` から `"paths": { … }` を消す
- `vitest.config.ts`・`vitest.config.e2e.ts` から `resolve: { alias: … }` を消し、`import { resolve } from 'node:path';` も消す

- [ ] **Step 6: CommonJS のパッケージの読み方を直す**

ESM の Node は CommonJS の `module.exports = …` から名前付き export を見つけられないことがある。次を直す。

- `lodash` の名前付き import（4 ファイル。`grep -rln "from 'lodash'" src '--include=*.ts'`）→ 関数ごとの default import にする。例:

```ts
import { cloneDeep, sortBy } from 'lodash';
```

を

```ts
import cloneDeep from 'lodash/cloneDeep.js';
import sortBy from 'lodash/sortBy.js';
```

- `pluralize`（`import pluralize, { singular } from 'pluralize'`）→ `import pluralize from 'pluralize';` にし、`singular(` を `pluralize.singular(` にする
- `import * as dayjs from 'dayjs'`（1 か所。`grep -rn "\* as dayjs" src '--include=*.ts'`）→ `import dayjs from 'dayjs';`
- `dayjs/plugin/*` の import（`dayjs/plugin/utc` など）→ `.js` を付ける（`dayjs/plugin/utc.js`）。dayjs の package.json に exports が無く、ESM の Node は拡張子を補わない

`grep -rnE "from 'dayjs/plugin/[a-zA-Z]+'" src db/seeds '--include=*.ts'` が何も出なくなるまで直す。

- [ ] **Step 7: エンティティの関連を `Relation<>` で包む**

`.context/wrap_relations.py`

```python
"""TypeORM のエンティティで、関連（ManyToOne・OneToOne・OneToMany・ManyToMany）のプロパティの型を Relation<…> で包む。
ESM では循環 import とデコレータのメタデータ（design:type）が重なると初期化前参照で落ちるため。"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECO = re.compile(r'^\s*@(ManyToOne|OneToOne|OneToMany|ManyToMany)\(')
PROP = re.compile(r'^(?P<indent>\s*)(?P<mods>(?:readonly\s+)?)(?P<name>\w+)(?P<opt>[?!]?):\s*(?P<type>[^;=]+?)\s*;\s*$')
changed = 0
for f in ROOT.glob('src/**/*.model.ts'):
    lines = f.read_text().split('\n')
    pending = False
    hit = False
    for i, line in enumerate(lines):
        if DECO.match(line):
            pending = True
            continue
        if pending:
            m = PROP.match(line)
            if m:
                t = m.group('type')
                if not t.startswith('Relation<'):
                    lines[i] = f"{m.group('indent')}{m.group('mods')}{m.group('name')}{m.group('opt')}: Relation<{t}>;"
                    hit = True
                pending = False
    if hit:
        text = '\n'.join(lines)
        text, n = re.subn(r"import \{([^}]*)\} from 'typeorm';",
                          lambda m: m.group(0) if 'Relation' in m.group(1)
                          else "import {" + m.group(1).rstrip().rstrip(',') + ", Relation } from 'typeorm';",
                          text, count=1)
        if n == 0:
            text = "import { Relation } from 'typeorm';\n" + text
        f.write_text(text)
        changed += 1
print(changed, 'files')
```

Run: `python3 .context/wrap_relations.py && npx prettier --write src/libs/*/infrastructure/models/*.model.ts > /dev/null && git diff --stat -- 'src/**/*.model.ts' | tail -1`
Expected: `23 files` 前後。差分は型の `Relation<…>` と typeorm の import だけ（`git diff -- src/libs/trip/infrastructure/models/trip.model.ts` で目で見る）

- [ ] **Step 8: `__dirname` を直す**

`grep -rn "__dirname\|__filename" src db/seeds '--include=*.ts'` に出たもの（`database.config.ts`・seed・spec の計 4 か所）の `__dirname` を `import.meta.dirname` にする。

- [ ] **Step 9: dist に package.json を書く・seed と CLI の loader を替える**

`package.json` の scripts を次にする（変える行・足す行だけ）。

```json
        "postbuild": "node -e \"require('node:fs').writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }) + '\\n')\"",
        "typeorm": "node --import @swc-node/register/esm-register ./node_modules/typeorm/cli.js",
        "cli": "npm run dotenv -- node --import @swc-node/register/esm-register src/cli.ts",
        "seed:calendar-dates:holidays": "npm run dotenv -- node --import @swc-node/register/esm-register db/seeds/seed-calendar-dates-holidays.ts",
        "seed:calendar-dates:special": "npm run dotenv -- node --import @swc-node/register/esm-register db/seeds/seed-calendar-dates-special.ts",
        "seed:calendar-dates:newyear": "npm run dotenv -- node --import @swc-node/register/esm-register db/seeds/seed-calendar-dates-newyear.ts"
```

`node -e` は `"type": "module"` でも CommonJS として評価されるので `require` が使える。

`src/main.ts` と `src/cli.ts` の末尾の `bootstrap();` はそのまま（ESM でも動く）。

- [ ] **Step 10: ビルドと smoke**

Run: `npm run build > .context/task8_build2.log 2>&1; echo $?; head -30 .context/task8_build2.log; cat dist/package.json`
Expected: `0`・`{"type":"module"}`

Run: `SUPABASE_URL=https://dummy.invalid node .context/smoke_import_dist.mjs > .context/task8_smoke.log 2>&1; echo $?; tail -15 .context/task8_smoke.log`
Expected: `0`・`smoke N/N ok`。`NG` が出たら、メッセージごとに直す:
- `Named export 'x' not found` → Step 6 の形（default import してから取り出す）に直す
- `Cannot access 'X' before initialization` → そのエンティティの関連の型が `Relation<>` で包まれているかを見る。包まれていなければ手で包む
- `Cannot find module …/foo` → `.js` の付け忘れ（tsc が見逃す `import()` の式など）

- [ ] **Step 11: 読み込み時間の計測を ESM に合わせる**

`.context/measure_load.sh` の `node -e "…"` の中身を次にする（`require` を `import()` に替える）。

```bash
  ms=$(node --input-type=module -e "
    import { resolve } from 'node:path';
    import { pathToFileURL } from 'node:url';
    const t0 = performance.now();
    await import(pathToFileURL(resolve(process.argv[1])).href);
    const t1 = performance.now();
    process.stdout.write(t1.toFixed(1) + ' ' + (t1 - t0).toFixed(1));
    process.exit(0);
  " "$target")
```

Run: `SUPABASE_URL=https://dummy.invalid bash .context/measure_load.sh dist/app.module.js 15`
Expected: 中央値が出る（比べるのは Task 9）

- [ ] **Step 12: 型・テスト・lint**

Run: `npx tsc --noEmit -p tsconfig.json > .context/task8_tsc.log 2>&1; echo $?; head -20 .context/task8_tsc.log`
Expected: `0`

Run: `npm test > .context/task8_test.log 2>&1; echo $?; grep -E "Test Files|Tests" .context/task8_test.log`
Expected: `0`・件数は Task 7 と同じ

Run: `npx eslint "{src,apps,libs,test}/**/*.ts" -f json -o .context/task8_lint.json > /dev/null 2>&1; python3 .context/lint_count.py .context/task8_lint.json | head -3`
Expected: `total 0`

- [ ] **Step 13: 手元で起動する**

Run: `SUPABASE_URL=https://dummy.invalid timeout 20 node dist/main.js > .context/task8_boot.log 2>&1; grep -E "ERR_|SyntaxError|before initialization|Nest can't resolve" .context/task8_boot.log | head`
Expected: 何も出ない（DB に繋がらないことによるエラーは出てよい）

- [ ] **Step 14: CLI と migration**

Run: `npm run cli -- --help > .context/task8_cli.log 2>&1; echo $?; grep -c rebuildLatestCache .context/task8_cli.log`（サンドボックス外）
Expected: `0`・1 以上

Run: `npm run migration:generate -- db/migrations/NoopCheck > .context/task8_mig.log 2>&1; echo $?; grep -E "No changes" .context/task8_mig.log; git status --short db/migrations`（サンドボックス外）
Expected: `0`・`No changes …`・`git status` が空

@swc-node/register の ESM loader が `.js` の import を `.ts` に解決できず落ちたら、`node --import @swc-node/register/esm-register` を `node --import ./.context/…` にせず、ledger に記録したうえで CLI と migration を dist から流す形に切り替える:
- `"cli": "npm run build && npm run dotenv -- node dist/cli.js"`
- `"typeorm": "typeorm"`・`migration:*` の `-d src/core/utils/data-source.ts` を `-d dist/core/utils/data-source.js` にし、`database.config.ts` の migrations の glob が `db/migrations` の `.ts` を読めないことを踏まえ、migration は `tsc -p tsconfig.migrations.json`（`db/migrations` を `dist-migrations/` に出す設定）で JS にしてから流す。この切り替えを選んだら、その設定ファイルの中身もこの Step でコミットに含める

- [ ] **Step 15: Commit**

`.context/task8_commit_msg.txt`

```
refactor!: :recycle: ESM に切り替える

package.json を "type": "module" にし、相対 import に .js を付け、src/… の import を相対パスにする。
エンティティの関連を Relation<> で包み、__dirname を import.meta.dirname にする。
dist には build のあとに {"type":"module"} の package.json を書く（デプロイ物は dist だけのため）。

BREAKING CHANGE: アプリを CommonJS から ESM に切り替えた。
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
```

```bash
git add -A package.json package-lock.json tsconfig.json vitest.config.ts vitest.config.e2e.ts src test db/seeds db/migrations
git diff --cached --stat | tail -3
git commit -q -S -F .context/task8_commit_msg.txt
git log -1 --format='%h %G? %s'
```

---

### Task 9: 段 2 の確かめ

**Files:** なし（`.context/verify_stage.sh` を流すだけ）

- [ ] **Step 1: 開発コンテナを作り直す**

```bash
docker compose build development-api
docker compose up -d --renew-anon-volumes development-api
docker logs --tail 30 sotetsu-lab-v3-api-development-api-1
```

Expected: `Nest application successfully started`。`ERR_`・`SyntaxError`・`before initialization` が無い

- [ ] **Step 2: 流す**

Run: `bash .context/verify_stage.sh stage2 > .context/verify_stage2.log 2>&1; cat .context/verify_stage2.log`（サンドボックス外）
Expected: Task 6 Step 3 と同じ基準を全部満たす。加えて 8 の中央値が段 1 の中央値から +20% 以内

- [ ] **Step 3: デプロイ物の中身を確かめる**

Run: `npx serverless package --stage prod > .context/task9_package.log 2>&1; echo $?; unzip -l .serverless/*.zip | grep -E "dist/(package.json|main.js|run.sh)"`（サンドボックス外。AWS の認証が要ればユーザーに `!` で頼む）
Expected: `0`。`dist/package.json`・`dist/main.js`・`dist/run.sh` の 3 つが出る

zip を展開して、Lambda と同じ形で起動できるかを見る:
Run: `rm -rf "$TMPDIR/pkg" && mkdir -p "$TMPDIR/pkg" && unzip -q .serverless/*.zip -d "$TMPDIR/pkg" && ls "$TMPDIR/pkg/dist/package.json"`
Expected: ある（node_modules はレイヤー側なのでここでは起動まではしない）

- [ ] **Step 4: 書き込みテスト**

Task 6 Step 4 と同じ手順を、同じ列番 `9997T` で行う（段 1 の `9997T` が残っていれば、まず画面からその列車を削除してから新規登録する）。終わったら Supabase MCP で `9997T` の列車・trip_operation_lists・trip_block の id を引き、後始末の SQL を作る。

```sql
begin;
delete from trip_operation_lists where trip_id in (select id from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number = '9997T');
delete from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number = '9997T';
delete from trip_blocks b where b.id in (<引いた trip_block の id をカンマ区切り>) and not exists (select 1 from trips t where t.trip_block_id = b.id);
commit;
```

（`<…>` は Supabase MCP で引いた実際の id に置き換えてから渡す）

- [ ] **Step 5: e2e を流す**

`test/app.e2e-spec.ts` は DB に繋ぐので、`.env.local` を読ませて流す。
Run: `npm run dotenv -- npm run test:e2e > .context/task9_e2e.log 2>&1; echo $?; grep -E "Test Files|Tests" .context/task9_e2e.log`（サンドボックス外）
Expected: `0`。落ちたら、段 1 の時点（Task 6 の後）でも同じように落ちるか（`git stash` せず、`git worktree add` で Task 5 のコミットを取り出して `npx jest --config test/jest-e2e.json` を流す）を見て、もともと落ちていたなら ledger に書いて進む

---

### Task 10: ドキュメントと PR

**Files:**
- Create: `docs/adr/0007-nestjs-12-and-esm.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: ADR を書く**

`docs/adr/0007-nestjs-12-and-esm.md`

```markdown
# ADR-0007: NestJS 12 に上げ ESM に切り替える

- **日時**: 2026-10-21
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: build/nestjs-12
- **spec**: docs/superpowers/specs/2026-10-21-nestjs-12-and-esm-design.md

---

## 背景

- NestJS 10 はサポートが切れていた。12 は ESM のパッケージだけを出す（CommonJS からは Node の `require(esm)` で読める）。
- TypeScript 6 で、今の tsconfig の `baseUrl`・`moduleResolution`（node10）・`rootDir` の推論が非推奨か挙動変更になった。

## 決定

- NestJS 12・TypeScript 6.0 に上げ、NestJS に引きずられない依存も最新にする（typeorm 0.3 は据え置き）。
- アプリを ESM（`"type": "module"`）に切り替え、import は `.js` 付きで書く。`src/…` の絶対 import はやめて相対パスにする。
- テストは Jest から Vitest＋unplugin-swc に替える。
- ts-node をやめ、CLI・migration・seed は `@swc-node/register` の ESM loader で流す。
- デプロイ物は `dist/**` だけなので、build のあとに `dist/package.json`（`{"type":"module"}`）を書く。

## 根拠

- `.js` を避けるため rspack でバンドルする案を比べた。2026-10-21 に手元で `AppModule` の require を 15 回ずつ測ると、アプリ全体 431 ms・依存だけ 438 ms（中央値）で、自前のコードをまとめても起動は速くならない。仕組みが増えるだけなので採らない。
- Jest の ESM 対応は試験段階。NestJS 12 の ESM 雛形は Vitest を使う。
- ESM では循環 import とデコレータのメタデータが重なると初期化前参照で落ちるので、エンティティの関連は `Relation<>` で包む（TypeORM が勧める回避策）。

## 却下した案

- バンドル（rspack）で `.js` を避ける（上の計測）。
- `ignoreDeprecations: "6.0"` で TS 6 の非推奨を黙らせる（TS 7 では効かない）。
- CommonJS のまま 12 に上げて止める（ユーザーが ESM 化を選んだ）。

## 影響

- import を書くときは `.js` を付ける（付け忘れは tsc がエラーにする）。CommonJS のパッケージから名前付きで import すると、tsc を通っても実行時に落ちることがある。`.context/smoke_import_dist.mjs` のように dist を Node で import して確かめる。
- helmet 8 で既定のヘッダーが変わった（PR #<番号> に一覧）。
- 版は major（v5.0.0）。
```

（`PR #<番号>` は Step 4 で PR を作ってから実際の番号に直してコミットする）

- [ ] **Step 2: CLAUDE.md を直す**

`CLAUDE.md` の次を直す。
- 「主要な技術スタック」の `- **テスト** - Jest + ts-jest + Supertest` を `- **テスト** - Vitest + unplugin-swc + Supertest`
- 「テスト戦略」の `- Jest 設定 - \`src/\` をルートで \`.spec.ts$\` マッチ` を `- Vitest 設定 - \`vitest.config.ts\`（\`src/**/*.spec.ts\`）。e2e は \`vitest.config.e2e.ts\``
- 「開発上の注意点」に次の節を足す:

```markdown
### ESM
- `"type": "module"`。相対 import には `.js` を付ける（`import { X } from './x.js'`）。`src/…` の絶対 import は使えない
- CommonJS のパッケージ（lodash など）からの名前付き import は実行時に落ちることがある。関数ごとの default import（`lodash/cloneDeep.js`）にする
- エンティティの関連の型は `Relation<…>` で包む（ESM の循環 import 対策）
- CLI・migration・seed は `@swc-node/register/esm-register` で TS のまま流す
```

- 「よく使うコマンド」の `npm run test -- operation-sighting.v3.service` 等の例は vitest でもそのまま使えるので変えない

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0007-nestjs-12-and-esm.md CLAUDE.md
git diff --cached --stat
git commit -q -S -m "docs: :memo: NestJS 12 化と ESM 化を ADR と CLAUDE.md に書く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

- [ ] **Step 4: push と PR**

push は HTTPS＋gh（SSH はサンドボックス外の手元から通らないことがある）。

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -q https://github.com/kaito3desuyo/sotetsu-lab-v3-api.git build/nestjs-12
```

PR 本文（`.context/pr_nestjs12.md`）: 概要・段 1 と段 2 で変えたもの・変えないもの・確かめの結果（`verify_stage1.log`・`verify_stage2.log` の要点、65 本、ヘッダーの差の一覧、読み込み時間、書き込みテスト、e2e）・後始末の SQL（Task 9 Step 4）・デプロイ（major v5.0.0、マージ後に `npm version major`、デプロイ後に v3 の確認スクリプトと Lambda の Init Duration）。末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)` と Session URL。

```bash
gh pr create -R kaito3desuyo/sotetsu-lab-v3-api -B master -H build/nestjs-12 -t "NestJS 12 に上げ ESM に切り替える" -F .context/pr_nestjs12.md
```

PR 番号が決まったら ADR の `PR #<番号>` を直し、`docs: :memo: ADR-0007 に PR 番号を書く` でコミットして push する。

- [ ] **Step 5: CI を待つ**

Run: `gh pr checks <番号> -R kaito3desuyo/sotetsu-lab-v3-api --watch --interval 20`
Expected: 全部 pass。`npm ci` が `UNMET PEER` で落ちたら、`package-lock.json` を `npm install` で作り直してコミットする

マージ・版上げ（`npm version major`）・デプロイ・後始末の SQL はユーザーが行う。デプロイ後に `.context/prod_check_no_cognito.sh` を流し、client の主な画面と Lambda の Init Duration（デプロイ前後の REPORT 行。出ない設定なら `aws logs` の `Init Duration` を Logs Insights で引く）を見る。
