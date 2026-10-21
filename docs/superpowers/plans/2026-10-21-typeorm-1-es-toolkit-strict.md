# TypeORM 1.x 化・lodash 撤去・strict 有効化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** api の lodash を標準の関数に置き換えて外し、typeorm を 1.1.x に上げ、TypeScript の strict を有効にする。v3 の振る舞いは変えない。

**Architecture:** 3 段をコミットで分ける。段 1 は lodash の 3 か所を、今の挙動を押さえる spec を書いてから標準に置き換える。段 2 は公式 codemod で typeorm 1.x に上げ、本番 DB に向けた読み書きと Lambda と同じ配置での起動で確かめる。段 3 は TS2564 を `!` で機械的に片付け、残りを手で直してから `strict: false` を消す。

**Tech Stack:** NestJS 12・TypeScript 6.0・typeorm 1.1.x・Vitest 5＋unplugin-swc・@swc-node/register・Node 24

**Spec:** docs/superpowers/specs/2026-10-21-typeorm-1-es-toolkit-strict-design.md

## Global Constraints

- 対象は sotetsu-lab-v3-api のみ。ブランチは `refactor/typeorm-1-es-toolkit-strict`、PR は 1 本
- v3 の URL・応答の中身・Cache-Control・認証・ヘッダー・DB のスキーマ・Lambda の構成は変えない
- lodash の置き換えは標準（ECMAScript・Node 組み込み）を優先し、足りないものだけ es-toolkit 本体（`es-toolkit`、`compat` は使わない）
- `db/backup`・`db/oldSeedMigration`・`db/oldTableMigration`・`db/seeds/trips_seed_import_functions.ts`・`db/seeds/operation_sighting_import_functions.ts` には触らない
- typeorm は `^1.1.2`、`@nestjs/typeorm` は `^12.0.2` のまま
- strict: TS2564 は `!`（`?` にしない）。`as any`・`@ts-ignore`・`@ts-expect-error` は足さない。`useDefineForClassFields: false` は残す
- 版は patch（v4.0.2）。コミットの型は `build`・`refactor`・`test`・`docs`、`!` は付けない。版上げ（`npm version patch`）はマージ後にユーザーが行う
- `serverless package`・`serverless deploy` を手元で流さない（S3 の layers/package.json を上書きし、CI が古いレイヤーを使い回す）
- テスト・CLI・migration・e2e・tsc 以外の Node で SWC を読むものはサンドボックス外で流す（`ERR_SWC_NATIVE_CACHE`）。npm の通信は `allowed_domains: registry.npmjs.org`
- ローカルの api（コンテナ `sotetsu-lab-v3-api-development-api-1`、:3000）は本番 DB を読む。書き込みテストは渋谷工事臨時ダイヤ（calendar_id `27792766-0031-4b89-9c32-23eea267cbbc`）だけで、列番は `9996T`・`9997T`
- Supabase MCP は読み取り専用。本番 DB への後始末の SQL はユーザーに流してもらう
- コミットは GPG 署名つき・サンドボックス外で行い、`git log -1 --format='%h %G? %s'` で `G` を確かめる
- 複数行のインラインスクリプトは hook に止められる。スクリプトは `.context/` に書いてから流す。Bash でパイプをつながない（`>` でファイルに出してから読む）
- コミットメッセージの末尾に次の 2 行を付ける
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`

## Review Focus

- 書き込み（trip-blocks の登録・置き換え・付け外し）で typeorm 1.x の cascade・save の挙動が変わり、時刻や運用のつながりが落ちる → Task 3 の書き込みテストで押さえる
- QueryBuilder の `where` に undefined・null が渡る所で、1.x の SQL が変わり 0 件や全件になる → Task 3 の GET 65 本の突き合わせで押さえる。差が出た URL はその Query の spec を足して直す
- `manager.connection` が 1.x で `manager.dataSource` になり、最新目撃の取得（`findLatestByKeys` 系）が実行時に落ちる → Task 2 で spec のモックも `dataSource` に直し、Task 3 の突き合わせ（real-time 系の URL を含む）で押さえる
- strict で足した null の分岐が、今まで通っていた応答を 404 や空に変える → Task 5 で振る舞いが変わる直しは spec を先に書く。Task 6 で GET 65 本をもう一度流す
- Lambda のレイヤー配置で typeorm 1.x の依存（新しく増えた依存を含む）が解決できず起動しない → Task 3 でレイヤーと同じ配置の起動スモークを `npm ci --omit=dev` で作り直して流す

---

### Task 1: lodash を標準の関数に置き換えて外す

**Files:**
- Create: `src/core/classes/value-object.spec.ts`
- Create: `src/libs/service/infrastructure/queries/service.query.spec.ts`
- Modify: `src/core/classes/value-object.ts`
- Modify: `src/libs/service/infrastructure/queries/service.query.ts:3-4,147-163`
- Modify: `package.json`・`package-lock.json`（`lodash`・`@types/lodash` を外す）

**Interfaces:**
- Consumes: なし
- Produces: `ValueObject.isEqual(vo?)` と `ServiceQuery.findOneStationsForService({ serviceId })` の挙動は今と同じ

- [ ] **Step 1: ValueObject の今の挙動を押さえる spec を書く**

`src/core/classes/value-object.spec.ts`:

```ts
import dayjs from 'dayjs';
import { ValueObject } from './value-object.js';

class Sample extends ValueObject<Record<string, unknown>> {}

describe('ValueObject.isEqual', () => {
    it('入れ子のオブジェクトと配列の中身が同じなら等しい', () => {
        const a = new Sample({ n: 1, nested: { list: [1, 2, { x: 'a' }] } });
        const b = new Sample({ n: 1, nested: { list: [1, 2, { x: 'a' }] } });
        expect(a.isEqual(b)).toBe(true);
    });

    it('入れ子の値が違えば等しくない', () => {
        const a = new Sample({ nested: { list: [1, 2] } });
        const b = new Sample({ nested: { list: [2, 1] } });
        expect(a.isEqual(b)).toBe(false);
    });

    it('同じ時刻の Date・dayjs は等しく、違う時刻なら等しくない', () => {
        const t = '2026-10-21T12:00:00+09:00';
        expect(
            new Sample({ d: new Date(t), j: dayjs(t) }).isEqual(
                new Sample({ d: new Date(t), j: dayjs(t) }),
            ),
        ).toBe(true);
        expect(
            new Sample({ d: new Date(t) }).isEqual(
                new Sample({ d: new Date('2026-10-21T12:00:01+09:00') }),
            ),
        ).toBe(false);
    });

    it('undefined のプロパティがある側と無い側は等しくない', () => {
        expect(new Sample({ a: undefined }).isEqual(new Sample({}))).toBe(
            false,
        );
    });

    it('null・undefined と比べると等しくない', () => {
        const a = new Sample({ n: 1 });
        expect(a.isEqual(undefined)).toBe(false);
        expect(a.isEqual(null as unknown as Sample)).toBe(false);
    });
});
```

- [ ] **Step 2: 今の lodash のまま流して全部通ることを確かめる（挙動の記録）**

Run（サンドボックス外）: `npx vitest run src/core/classes/value-object.spec.ts > .context/t1_vo_before.txt 2>&1`、続けて `tail -n 8 .context/t1_vo_before.txt`
Expected: `Tests  5 passed (5)`。落ちるものがあれば、それが lodash の今の挙動。期待値を今の挙動に合わせて書き直し、ledger に `Task 1: Ruling: lodash isEqual は <ケース> で <結果>` と記録する（置き換え後も同じ結果にするのが目的）

- [ ] **Step 3: ServiceQuery.findOneStationsForService の今の挙動を押さえる spec を書く**

`src/libs/service/infrastructure/queries/service.query.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSourceConfig } from '../../../../core/configs/database.config.js';
import { ServiceStationsDtoBuilder } from '../builders/service-stations.dto.builder.js';
import { ServiceModel } from '../models/service.model.js';
import { ServiceQuery } from './service.query.js';

const station = (id: string) => ({ id, stationName: id });
const rsl = (id: string, stationId: string, stationSequence: number) => ({
    id,
    stationId,
    stationSequence,
    station: station(stationId),
});

// 本線（昇り順 A→C、並びを崩して渡す）と支線（降り順 B→D）
const mainRsls = [rsl('m3', 'C', 3), rsl('m1', 'A', 1), rsl('m2', 'B', 2)];
const branchRsls = [rsl('b1', 'D', 1), rsl('b2', 'B', 2)];
const service = {
    id: 'svc',
    operatingSystems: [
        {
            route: { routeName: '本線', routeStationLists: mainRsls },
            startRouteStationList: mainRsls[1],
            endRouteStationList: mainRsls[0],
            startRouteStationListId: 'm1',
            endRouteStationListId: 'm3',
        },
        {
            route: { routeName: '支線', routeStationLists: branchRsls },
            startRouteStationList: branchRsls[1],
            endRouteStationList: branchRsls[0],
            startRouteStationListId: 'b2',
            endRouteStationListId: 'b1',
        },
    ],
};

function chain(result: unknown) {
    const qb: Record<string, unknown> = {};
    for (const m of ['leftJoinAndSelect', 'where', 'orderBy', 'addOrderBy']) {
        qb[m] = vi.fn().mockReturnValue(qb);
    }
    qb.getOne = vi.fn().mockResolvedValue(result);
    return qb;
}

async function buildQuery(result: unknown): Promise<ServiceQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ServiceQuery,
            {
                provide: getRepositoryToken(ServiceModel),
                useValue: { createQueryBuilder: () => chain(result) },
            },
            { provide: getEntityManagerToken(DataSourceConfig), useValue: {} },
        ],
    }).compile();
    return module.get(ServiceQuery);
}

describe('ServiceQuery.findOneStationsForService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('運行系統ごとに駅を並べ、支線は分岐駅の後ろに差し込む', async () => {
        const spy = vi.spyOn(ServiceStationsDtoBuilder, 'buildFromModel');
        const query = await buildQuery(service);

        await query.findOneStationsForService({ serviceId: 'svc' });

        const { stations } = spy.mock.calls[0][0];
        expect(stations.map((s) => s.id)).toEqual(['A', 'B', 'D', 'C']);
    });

    it('元の駅の並び（routeStationLists）を書き換えない', async () => {
        vi.spyOn(ServiceStationsDtoBuilder, 'buildFromModel');
        const query = await buildQuery(service);

        await query.findOneStationsForService({ serviceId: 'svc' });

        expect(mainRsls.map((r) => r.id)).toEqual(['m3', 'm1', 'm2']);
        expect(branchRsls.map((r) => r.id)).toEqual(['b1', 'b2']);
    });

    it('運行系統が見つからなければ null', async () => {
        const query = await buildQuery(null);
        await expect(
            query.findOneStationsForService({ serviceId: 'none' }),
        ).resolves.toBeNull();
    });
});
```

- [ ] **Step 4: 今の lodash のまま流して通ることを確かめる（挙動の記録）**

Run（サンドボックス外）: `npx vitest run src/libs/service/infrastructure/queries/service.query.spec.ts > .context/t1_svc_before.txt 2>&1`、続けて `tail -n 8 .context/t1_svc_before.txt`
Expected: `Tests  3 passed (3)`。1 本目だけ並びが違って落ちたら、出力の `Received` が今の挙動。期待値をその並びに直し、ledger に `Task 1: Ruling: 駅の並びの期待値を今の挙動 <並び> に合わせた` と記録する。型エラーでモックが足りないと言われたら、`chain` に足りないメソッドを足す

- [ ] **Step 5: 標準の関数に置き換える**

`src/core/classes/value-object.ts` の 1 行目を差し替え、比較を変える:

```ts
import { isDeepStrictEqual } from 'node:util';
```

```ts
        return isDeepStrictEqual(this.props, vo.props);
```

`src/libs/service/infrastructure/queries/service.query.ts` の lodash の import 2 行（`cloneDeep`・`sortBy`）を消し、並べ替えと逆順を次にする:

```ts
            const byStationSequence = operatingSystem.route.routeStationLists.toSorted(
                (a, b) => a.stationSequence - b.stationSequence,
            );
            const sortedRSLs = isAscending
                ? byStationSequence
                : byStationSequence.toReversed();

            const initialPosition = pickedRouteStationLists
                .toReversed()
                .findIndex(
                    (o) =>
                        o.stationId ===
                        operatingSystem.startRouteStationList.stationId,
                );
```

- [ ] **Step 6: lodash を依存から外す**

Run（サンドボックス外・`allowed_domains: registry.npmjs.org`）: `npm uninstall lodash @types/lodash > .context/t1_uninstall.txt 2>&1`、続けて `grep -rn "lodash" src test package.json > .context/t1_lodash_left.txt`、`cat .context/t1_lodash_left.txt`
Expected: uninstall が成功し、`t1_lodash_left.txt` が空（`db/` は対象外なので出てこない）

- [ ] **Step 7: 2 つの spec と全体を流す**

Run（サンドボックス外）: `npx vitest run src/core/classes/value-object.spec.ts src/libs/service/infrastructure/queries/service.query.spec.ts > .context/t1_after.txt 2>&1`、`tail -n 8 .context/t1_after.txt`、続けて `npx tsc --noEmit -p tsconfig.json > .context/t1_tsc.txt 2>&1; echo rc=$?`、`npm test > .context/t1_suite.txt 2>&1`、`tail -n 6 .context/t1_suite.txt`
Expected: 2 つの spec が 8 passed、tsc rc=0、suite が全部通る（前回の 494 に今回の 8 本を足した 502）

- [ ] **Step 8: Commit**

```bash
git add src/core/classes/value-object.ts src/core/classes/value-object.spec.ts src/libs/service/infrastructure/queries/service.query.ts src/libs/service/infrastructure/queries/service.query.spec.ts package.json package-lock.json
git commit -m "refactor: :recycle: lodash をやめて標準の関数に置き換える

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

Expected: `G`

---

### Task 2: typeorm を 1.1.x に上げる

**Files:**
- Modify: `package.json`・`package-lock.json`
- Modify: codemod が書き換えるファイル（src・db/migrations・test）
- Modify: `src/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts:236`（`manager.connection` → `manager.dataSource`）
- Modify: `src/libs/operation-sighting/infrastructure/queries/operation-sighting.query.spec.ts:32-38`（モックの `connection` → `dataSource`）
- Modify: `package.json` の `typeorm` script（cli の場所が変わっていれば）

**Interfaces:**
- Consumes: Task 1 の後のコード
- Produces: typeorm 1.1.x で tsc・suite・migration・CLI が通る状態

- [ ] **Step 1: spec のモックを 1.x の形に直し、落ちることを確かめる**

`operation-sighting.query.spec.ts` の `mockRepository.manager` を次にする（1.x では `EntityManager.connection` が `dataSource` に変わる）:

```ts
    manager: {
        dataSource: {
            getMetadata: (target: { name: string }) => ({
                tableName: target.name,
            }),
        },
    },
```

Run（サンドボックス外）: `npx vitest run src/libs/operation-sighting/infrastructure/queries/operation-sighting.query.spec.ts > .context/t2_red.txt 2>&1`、`grep -E "Tests|TypeError" .context/t2_red.txt`
Expected: FAIL（`Cannot read properties of undefined (reading 'getMetadata')`）。最新目撃を引くテストが落ちる

- [ ] **Step 2: typeorm を上げる**

Run（サンドボックス外・`allowed_domains: registry.npmjs.org`）: `npm install typeorm@^1.1.2 > .context/t2_install.txt 2>&1; echo rc=$?`、`grep -E "ERESOLVE|peer|WARN" .context/t2_install.txt`
Expected: rc=0。peer の衝突なし（`@nestjs/typeorm` 12 の peer は `^1.0.0-dev`）

- [ ] **Step 3: 公式 codemod を流して差分を読む**

Run（サンドボックス外・`allowed_domains: registry.npmjs.org`）: `npx @typeorm/codemod v1 src/ db/migrations/ test/ > .context/t2_codemod.txt 2>&1; echo rc=$?`、続けて `git diff --stat > .context/t2_codemod_stat.txt`、`cat .context/t2_codemod_stat.txt`、`git diff > .context/t2_codemod.diff` を Read
Expected: rc=0。差分を全部読み、`package.json` で typeorm 以外の依存を上げていたら `git checkout -p package.json` で戻す（ledger に何を戻したかを書く）。`operation-sighting.query.ts:236` の `manager.connection` が `manager.dataSource` に変わっていなければ、手で次にする:

```ts
        const connection = this.operationSightingRepository.manager.dataSource;
```

- [ ] **Step 4: 型と spec を通す**

Run: `npx tsc --noEmit -p tsconfig.json > .context/t2_tsc.txt 2>&1; echo rc=$?`、`grep -c "error TS" .context/t2_tsc.txt`
Expected: rc=0。エラーが出たら upgrading guide（context7 の `/typeorm/typeorm/1.1.1`、`docs/docs/releases/1.0/02-upgrading-from-0.3.md`）を引いて 1 件ずつ直し、直した内容を ledger に `Task 2: Ruling:` で書く

Run（サンドボックス外）: `npm test > .context/t2_suite.txt 2>&1`、`tail -n 6 .context/t2_suite.txt`
Expected: 全部通る（Step 1 で落ちたテストも通る）

- [ ] **Step 5: CLI 用の typeorm の場所と migration を確かめる**

Run: `ls node_modules/typeorm/cli.js node_modules/typeorm/package.json > .context/t2_cli_path.txt 2>&1; cat .context/t2_cli_path.txt`
Expected: `cli.js` がある。無ければ `node_modules/typeorm/package.json` の `bin` を読み、`package.json` の `typeorm` script のパスをそこへ直す

Run（サンドボックス外）: `npm run migration:generate -- db/migrations/TypeormOneCheck > .context/t2_migration.txt 2>&1; echo rc=$?`、`tail -n 5 .context/t2_migration.txt`
Expected: `No changes in database schema were found`（rc は 1 でよい）。ファイルができてしまったら中身を Read して差分の原因（列の型・既定値・インデックス名の読み方）を調べ、エンティティ側の書き方で差分を消す。作られたファイルは消す

Run（サンドボックス外）: `npm run cli -- operation-sighting rebuild-latest-cache --help > .context/t2_cli.txt 2>&1; echo rc=$?`、`cat .context/t2_cli.txt`
Expected: rc=0 で使い方が出る

- [ ] **Step 6: build と e2e と lint**

Run: `npm run build > .context/t2_build.txt 2>&1; echo rc=$?`
Expected: rc=0

Run（サンドボックス外）: `npm run dotenv -- npm run test:e2e > .context/t2_e2e.txt 2>&1`、`tail -n 6 .context/t2_e2e.txt`
Expected: 2 passed

Run: `npx eslint "{src,apps,libs,test}/**/*.ts" > .context/t2_eslint.txt 2>&1; echo rc=$?`、`tail -n 3 .context/t2_eslint.txt`
Expected: rc=0

- [ ] **Step 7: Commit**

```bash
git add -A src db/migrations test package.json package-lock.json
git status --short
git commit -m "build: :arrow_up: typeorm を 1.1 に上げる

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

Expected: `git status --short` に `.context/` やマイグレーションの試しファイルが無い。`G`

---

### Task 3: typeorm 1.x を本番 DB と Lambda の配置で確かめる

**Files:**
- Create: `.context/smoke_layer_layout_local.sh`（gitignore 済み・コミットしない）
- Modify: なし（差が出た時だけ、その Query と spec）

**Interfaces:**
- Consumes: Task 2 の build（`dist/`）
- Produces: ledger に「GET 65/65・fields・書き込み・起動」の結果と後始末の SQL

- [ ] **Step 1: 手元の api コンテナを新しい依存で起動し直す**

Run（サンドボックス外）: `docker exec sotetsu-lab-v3-api-development-api-1 npm ci > .context/t3_container_ci.txt 2>&1; echo rc=$?`、続けて `docker restart sotetsu-lab-v3-api-development-api-1`、40 秒ほど後に `docker logs --since 2m sotetsu-lab-v3-api-development-api-1 > .context/t3_container_log.txt 2>&1`、`grep -E "error TS|successfully started|Error" .context/t3_container_log.txt`
Expected: `Nest application successfully started`、`error TS` なし

- [ ] **Step 2: GET の突き合わせと fields**

Run（サンドボックス外）: `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt python3 .context/compare_local_prod.py > .context/t3_compare.txt 2>&1`、`tail -n 5 .context/t3_compare.txt`
Expected: `same=65 diff=0 total=65`。`BODY differs` が出たら、その URL の手元と本番の応答を `.context/` に保存して差を読み、原因の Query に spec を足してから直す（Review Focus の 2 行目）

Run（サンドボックス外）: `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt python3 .context/probe_fields.py > .context/t3_fields.txt 2>&1`、`cat .context/t3_fields.txt`
Expected: 本番と手元が同じバイト数、trip keys `['id', 'times', 'tripNumber']`

- [ ] **Step 3: 書き込みテストの前に前回のテスト列車が残っていないかを見る**

Supabase MCP（`execute_sql`・読み取り）で:

```sql
select trip_number, count(*) from trips
where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc'
  and trip_number in ('9996T', '9997T', '9998T', '9999T')
group by trip_number;
```

Expected: 0 行。行があれば、前回の後始末（`.context/cleanup_test_trips.sql`）がまだ流れていない。ここで止まり、ユーザーに `.context/cleanup_test_trips.sql` を流してもらってから続ける

- [ ] **Step 4: 書き込みテスト**

元にする trip_block を Supabase MCP で引く:

```sql
select trip_block_id from trips
where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc'
  and trip_number not like '999%'
limit 1;
```

Run（サンドボックス外）: `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt python3 .context/write_test.py <引いた trip_block_id> > .context/t3_write.txt 2>&1; echo rc=$?`、`cat .context/t3_write.txt`
Expected: rc=0。`POST bulk 201`・`PUT 200`・`departureTime` が 1 分進む・`PATCH delete-trip 200`・`held as block <id>`・`PATCH add-trip 200`・`trips in block ['9996T', '9997T']`。最後の `CLEANUP` 行を ledger に写す

- [ ] **Step 5: 後始末の SQL を作る**

`.context/cleanup_typeorm1_test_trips.sql` に、`.context/cleanup_test_trips.sql` と同じ形（`trip_operation_lists` → `times` → `trips` → 空になった `trip_blocks` の順・`begin`/`commit`）で、列番 `9996T`・`9997T` と Step 4 の `CLEANUP block ids` を入れて書く。流すのは PR 前にユーザーへ頼む（Task 6）

- [ ] **Step 6: Lambda と同じ配置で起動する（serverless package を使わない）**

`.context/smoke_layer_layout_local.sh`:

```bash
#!/usr/bin/env bash
# Lambda と同じ配置（アプリ = task/dist、依存 = opt/nodejs/node_modules）で dist/run.sh を流す。
# serverless package は S3 を書き換えるので使わず、レイヤーの中身は npm ci --omit=dev で作る。
set -u
cd "$(dirname "$0")/.."
root="${TMPDIR:-/tmp}/lambda-layout-local"
rm -rf "$root" && mkdir -p "$root/task" "$root/opt/nodejs"
cp -r dist "$root/task/dist"
cp package.json package-lock.json "$root/opt/nodejs/"
(cd "$root/opt/nodejs" && npm ci --omit=dev --ignore-scripts > "$root/ci.log" 2>&1) || { echo "npm ci failed"; tail -n 5 "$root/ci.log"; exit 1; }
cd "$root/task"
export NODE_PATH="$root/opt/nodejs/node24/node_modules:$root/opt/nodejs/node_modules:$root/task"
NODE_ENV=production TZ=Asia/Tokyo SUPABASE_URL=https://dummy.invalid DATABASE_URL="${SMOKE_DATABASE_URL:-postgres://u:p@127.0.0.1:1/x}" timeout 20 sh dist/run.sh > "$root/out.log" 2>&1
echo "exit $?"
grep -m3 -E "ERR_MODULE_NOT_FOUND|Cannot find (module|package)|SyntaxError" "$root/out.log" || echo "no resolve errors"
grep -m1 -oE "Nest application successfully started|ECONNREFUSED|Unable to connect to the database" "$root/out.log" || true
```

Run（サンドボックス外・`allowed_domains: registry.npmjs.org`）: `npm run build > .context/t3_build.txt 2>&1`、`npx dotenvx run --env-file=.env.local -- sh -c 'SMOKE_DATABASE_URL="$DATABASE_URL" bash .context/smoke_layer_layout_local.sh' > .context/t3_layer.txt 2>&1`、`cat .context/t3_layer.txt`
Expected: `no resolve errors`、`Nest application successfully started`

Run（サンドボックス外）: `SUPABASE_URL=https://dummy.invalid node .context/smoke_import_dist.mjs > .context/t3_smoke.txt 2>&1`、`tail -n 3 .context/t3_smoke.txt`
Expected: `smoke N/N ok`（N は前回の 288 前後）

- [ ] **Step 7: ledger に結果を書く（コミットなし）**

ledger に `Task 3: verified — GET 65/65・fields <bytes>・write ok（cleanup: .context/cleanup_typeorm1_test_trips.sql）・layer boot ok・smoke N/N` を書く。コードを直した時だけ、その spec と修正を `fix: :bug:` でコミットする

---

### Task 4: strict の TS2564 に `!` を付ける

**Files:**
- Create: `.context/add_definite_assignment.py`（コミットしない）
- Modify: tsc が TS2564 を出す全ファイル（エンティティ・DTO など）

**Interfaces:**
- Consumes: Task 2 の後のコード
- Produces: `npx tsc --noEmit --strict` で TS2564 が 0 件

- [ ] **Step 1: TS2564 の場所を出す**

Run: `npx tsc --noEmit -p tsconfig.json --strict > .context/t4_strict_before.txt 2>&1`、`grep -c "error TS2564" .context/t4_strict_before.txt`
Expected: 600 件前後（Task 2 の後で数が変わってよい）

- [ ] **Step 2: `!` を付けるスクリプトを書く**

`.context/add_definite_assignment.py`:

```python
"""tsc の TS2564（初期化していないプロパティ）の位置に ! を付ける。
`path(line,col): error TS2564: Property 'x' has no initializer ...` の col はプロパティ名の先頭。
名前の直後が ':' の時だけ '!:' にする（それ以外は触らず一覧に出す）。"""
import re
import sys
from collections import defaultdict

PAT = re.compile(r"^(.+?)\((\d+),(\d+)\): error TS2564: Property '([^']+)'")
hits = defaultdict(list)
for line in open(sys.argv[1], encoding='utf-8'):
    m = PAT.match(line)
    if m:
        hits[m.group(1)].append((int(m.group(2)), int(m.group(3)), m.group(4)))

done = skipped = 0
for path, items in hits.items():
    lines = open(path, encoding='utf-8').read().split('\n')
    for ln, col, name in items:
        text = lines[ln - 1]
        start = col - 1
        end = start + len(name)
        if text[start:end] == name and text[end:end + 1] == ':':
            lines[ln - 1] = text[:end] + '!' + text[end:]
            done += 1
        else:
            skipped += 1
            print(f'SKIP {path}:{ln}:{col} {name!r}: {text.strip()}')
    open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print(f'done={done} skipped={skipped}')
```

- [ ] **Step 3: 流して残りを見る**

Run: `python3 .context/add_definite_assignment.py .context/t4_strict_before.txt > .context/t4_apply.txt 2>&1`、`tail -n 20 .context/t4_apply.txt`
Expected: `skipped=0`。SKIP があれば、その行を Read して手で `!` を付ける（例: `name ?: T` の書き方や複数行の型）

Run: `npx tsc --noEmit -p tsconfig.json --strict > .context/t4_strict_after.txt 2>&1`、`grep -c "error TS2564" .context/t4_strict_after.txt`、`grep -c "error TS" .context/t4_strict_after.txt`
Expected: TS2564 が 0。全体は約 100 件（Task 5 で直す）

- [ ] **Step 4: 振る舞いが変わっていないことを確かめる**

`!` は型だけの印で、`useDefineForClassFields: false` の下では出力の JS が変わらない。

Run: `npx tsc --noEmit -p tsconfig.json > .context/t4_tsc.txt 2>&1; echo rc=$?`、`npm run build > .context/t4_build.txt 2>&1; echo rc=$?`、（サンドボックス外）`npm test > .context/t4_suite.txt 2>&1`、`tail -n 6 .context/t4_suite.txt`、`npx prettier --check $(git diff --name-only) > .context/t4_prettier.txt 2>&1; echo rc=$?`
Expected: tsc rc=0（strict 無しのまま）、build rc=0、suite 全部通る、prettier rc=0（崩れていたら変更したファイルだけ `npx prettier --write <ファイル>`）

- [ ] **Step 5: Commit**

```bash
git add -u src test
git commit -m "refactor: :label: 値を外から詰めるプロパティに確定代入の印を付ける

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

Expected: `G`

---

### Task 5: strict の残りを直して有効にする

**Files:**
- Modify: `tsconfig.json`（`"strict": false` の行を消す）
- Modify: `.context/t4_strict_after.txt` に出るファイル
- Test: 振る舞いを変える直しのあるファイルの `.spec.ts`

**Interfaces:**
- Consumes: Task 4 の後のコード
- Produces: `strict` 有効で tsc 0 件

- [ ] **Step 1: tsconfig から `strict: false` を消す**

`tsconfig.json` の `"strict": false,` の行を消す（TS 6 の既定で strict になる）。`"useDefineForClassFields": false` は残す。

Run: `npx tsc --noEmit -p tsconfig.json > .context/t5_tsc.txt 2>&1`、`grep -c "error TS" .context/t5_tsc.txt`、`grep -o -E "^[^(]+" .context/t5_tsc.txt > .context/t5_files.txt`、`sort -u .context/t5_files.txt -o .context/t5_files.txt`、`cat .context/t5_files.txt`
Expected: 約 100 件、ファイルの一覧が出る

- [ ] **Step 2: ファイルごとに直す（基準）**

各エラーを Read して、次の基準で直す。1 ファイル直すごとに `npx tsc --noEmit -p tsconfig.json > .context/t5_tsc.txt 2>&1` で数が減ることを見る。

- 本当に null・undefined が来る値（DB の null 可の列・`findOne` 系の戻り・`Map.get`・配列の `find`）: 分岐を足す。分岐が今の挙動（例外・`null` を返す・既定値）を変えるなら、先にその入力の spec を書いて今の挙動を確かめ、同じ挙動になる書き方にする。今の挙動が実行時エラー（`Cannot read properties of undefined`）なら、`UnexpectedError` を throw して 500 にする（CLAUDE.md の「データ不整合は UnexpectedError」）
- 来ないことが型の外で保証されている値（Nest の DI・直前の検証・クエリの `innerJoin`）: `!` か型の絞り込みにし、理由を 1 行コメントで書く。例:

```ts
        // innerJoin しているので operation は必ずある
        const operationNumber = model.operation!.operationNumber;
```

- 暗黙の any（TS7005・TS7034・TS7053）: 型を書く。添字アクセス（TS7053）は `Record<キーの型, 値の型>` か `keyof typeof` で型を付ける
- TS2416（基底クラスと型が合わない）: 基底の型に合わせる。戻りに `null` を足すなら呼び出し側も直す
- spec ファイルのエラーも同じ基準。テストのモックは、実物の型に合う形に直す（`as unknown as T` はモックの差し込みに限って使ってよい。`as any` は使わない）
- `as any`・`@ts-ignore`・`@ts-expect-error` は足さない

- [ ] **Step 3: 振る舞いが変わる直しの spec（RED→GREEN）**

Step 2 で振る舞いを変えた所ごとに、その入力の spec を直す前に書き、落ちることを見てから直す。Run（サンドボックス外）: `npx vitest run <その spec> > .context/t5_red_<n>.txt 2>&1`、`tail -n 8 .context/t5_red_<n>.txt`
Expected: 直す前に FAIL、直した後に PASS。ledger に `Task 5: behavior <ファイル:行> — <何が来ると何を返すか> — <spec 名> RED→GREEN` を書く。振る舞いが変わらない直し（型・`!`）だけなら、このステップは無しと ledger に書く

- [ ] **Step 4: 全部通す**

Run: `npx tsc --noEmit -p tsconfig.json > .context/t5_tsc.txt 2>&1; echo rc=$?`、`npx eslint "{src,apps,libs,test}/**/*.ts" > .context/t5_eslint.txt 2>&1; echo rc=$?`、`npm run build > .context/t5_build.txt 2>&1; echo rc=$?`、（サンドボックス外）`npm test > .context/t5_suite.txt 2>&1`、`tail -n 6 .context/t5_suite.txt`、`npm run dotenv -- npm run test:e2e > .context/t5_e2e.txt 2>&1`、`tail -n 6 .context/t5_e2e.txt`
Expected: tsc rc=0（strict）、eslint rc=0、build rc=0、suite・e2e 全部通る

Run: `grep -rn -E "as any|@ts-ignore|@ts-expect-error" src test > .context/t5_escape.txt`、`git diff master -- src test > .context/t5_diff.txt`、`grep -c -E "^\+.*(as any|@ts-ignore|@ts-expect-error)" .context/t5_diff.txt`
Expected: 足した行は 0（もとからあるものは数えない）

- [ ] **Step 5: Commit**

```bash
git add -u tsconfig.json src test
git commit -m "refactor: :label: TypeScript の strict を有効にする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

Expected: `G`。振る舞いを変えた直しがあれば、その直しと spec を先に `fix: :bug:` で別コミットにしてから、残りをこのコミットにする

---

### Task 6: 最後の確かめ・ADR・CLAUDE.md・PR

**Files:**
- Create: `docs/adr/0008-typeorm-1-standard-functions-strict.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1〜5
- Produces: PR

- [ ] **Step 1: strict の後でもう一度本番と突き合わせる**

Task 3 の Step 1・2・6 をもう一度流す（コンテナの再起動 → `compare_local_prod.py` → `probe_fields.py` → `smoke_layer_layout_local.sh` → `smoke_import_dist.mjs`）。
Expected: `same=65 diff=0 total=65`、fields が本番と同じバイト数、`no resolve errors`・`Nest application successfully started`、`smoke N/N ok`

- [ ] **Step 2: ADR-0008 を書く**

`docs/adr/0008-typeorm-1-standard-functions-strict.md`（`docs/adr/0007-nestjs-12-and-esm.md` と同じ見出しの形）に次を書く:

- 状況: ADR-0007 で後回しにした typeorm 1.x・lodash・strict
- 決定:
  - typeorm 1.1.x。公式 codemod で上げ、`manager.connection` → `manager.dataSource`（ほか Task 2 の ruling を全部）。確かめ方は migration の差分なし・GET 65 本・fields・書き込み・Lambda 配置の起動
  - lodash は標準に置き換え（`toSorted`・`toReversed`・`node:util` の `isDeepStrictEqual`）。標準で足りないものだけ es-toolkit 本体を使う方針。古いシード（`db/backup`・`db/oldSeedMigration` と補助 2 ファイル）は lodash の import が残るが、tsc・build・npm script の対象外なので放置
  - strict は TS 6 の既定に従う。外から値を詰めるプロパティは `!`。それ以外は黙らせず、null が来る所は分岐、保証がある所だけ理由のコメント付きの `!`。`as any`・`@ts-ignore` は使わない
- 結果: 版は patch v4.0.2。PR 番号

- [ ] **Step 3: CLAUDE.md を直す**

- 「主要な技術スタック」の `**DB** - TypeORM 0.3 + PostgreSQL` を `**DB** - TypeORM 1.x + PostgreSQL` にする
- 「ESM」の節の「CommonJS のパッケージ（lodash など）からの名前付き import は実行時に落ちることがある。関数ごとの default import（`lodash/cloneDeep.js`）にする」を「CommonJS のパッケージからの名前付き import は実行時に落ちることがある。default import にする。lodash は使わない（標準の関数を使い、足りなければ es-toolkit・ADR-0008）」にする
- 「開発上の注意点」に「TypeScript は strict。値を外から詰めるプロパティ（エンティティ・DTO）は `!`。`as any`・`@ts-ignore` は使わない」を足す

- [ ] **Step 4: docs を Commit**

```bash
git add docs/adr/0008-typeorm-1-standard-functions-strict.md CLAUDE.md
git diff --cached --stat
git commit -m "docs: :memo: typeorm 1.x・lodash 撤去・strict の ADR と CLAUDE.md を書く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
git log -1 --format='%h %G? %s'
```

Expected: `--stat` が 2 ファイルだけ。`G`

- [ ] **Step 5: push と PR**

Run（サンドボックス外）: `git push -u origin refactor/typeorm-1-es-toolkit-strict`、続けて `.context/pr_typeorm1.md` に本文（3 段の要約・確かめた結果・後始末の SQL `.context/cleanup_typeorm1_test_trips.sql` の中身・版は patch v4.0.2 をマージ後に `npm version patch`・末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)` と `https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`）を書き、`gh pr create -R kaito3desuyo/sotetsu-lab-v3-api --base master --title "TypeORM 1.x 化・lodash 撤去・strict 有効化" --body-file .context/pr_typeorm1.md`
Expected: PR の URL が出る。`gh pr checks <番号> -R kaito3desuyo/sotetsu-lab-v3-api --watch > .context/t6_checks.txt 2>&1` で CI が全部通る

- [ ] **Step 6: ユーザーに渡す**

後始末の SQL（`.context/cleanup_typeorm1_test_trips.sql`）を流してもらうことと、PR のレビュー・マージを頼む。マージはしない
