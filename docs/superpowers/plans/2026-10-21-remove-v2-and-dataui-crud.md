# v2 廃止と @dataui/crud 撤去 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** api の `/v2/*` を消し、`@dataui/crud` 系 3 パッケージを依存から外す。v3 の振る舞いは変えない。

**Architecture:** 削除が中心のリファクタ。①v2 の口と v2 だけの部品を消す → ②query・command から `TypeOrmCrudService` の継承と `CrudRequest` 用メソッドを外す → ③依存を外す → ④手元の api を本番と突き合わせる → ⑤文書。各段で `tsc`・jest が通る状態を保つ。

**Tech Stack:** NestJS 10・TypeORM 0.3・jest・TypeScript 4.7（版は変えない）

**Spec:** `docs/superpowers/specs/2026-10-20-remove-v2-and-dataui-crud-design.md`

## Global Constraints

- 対象は sotetsu-lab-v3-api のみ。client・backend・socket は触らない
- v3 の URL・応答・Cache-Control・認証（AuthGuard・RBACGuard）を変えない。継承を外す以外に v3 のロジックへ手を入れない
- DB のスキーマを変えない（マイグレーションを作らない）
- コミットは Conventional Commits＋絵文字（例: `refactor: :recycle: …`）。日本語。GPG 署名つき（サンドボックス外で commit）。末尾に Co-Authored-By と Claude-Session の 2 行
- master にコミットしない。ブランチは `refactor/remove-v2-and-dataui-crud`
- 版は major（v4.0.0）。版上げとデプロイはユーザーが行う
- Bash はパイプでつながない。複数行のスクリプトは `.context/` に置いてから流す
- 確認コマンド（以下「全チェック」）:
  - `npx tsc --noEmit -p tsconfig.json`
  - `npx jest`（全件）
  - `npx eslint "{src,apps,libs,test}/**/*.ts"`（`--fix` を付けない。直すのは自分の変更だけ）

## Review Focus

- **v3 の query・command の DI**: 継承を外したクラスが Nest の DI で解決できず、起動時に落ちる → Task 4 で手元の api を起動し、全 query・command を通る GET を叩いて確かめる
- **v3 の応答が変わる**: 継承を外しただけのつもりで、v3 のメソッドが継承元のメソッド（`this.find` など）に頼っていた → Task 2 の grep と、Task 4 の本番突き合わせで確かめる
- **trip-blocks の書き込み**: v3 は `bulkCreate`・`replaceOneTripBlockByDomain`・`deleteOneTripBlockByDomain` を使う。同じ command から v2 用メソッドを消して壊さない → Task 4 で臨時ダイヤに登録・更新・列車の追加と削除
- **`/v2/*` の応答**: 404 を返し、500 にならない。エラー応答は `Cache-Control: no-store` → Task 4 で確かめる
- **CLI**: `npm run cli -- rebuildLatestCache` は operation-sighting・trip-block の query・command を使う → Task 4 でヘルプ表示まで起動できることを確かめる

---

### Task 1: v2 の口と v2 だけの部品を消す

**Files:**
- Delete: 38 ファイル（下の Step 1）と、v2 を消すと孤児になる 6 ファイル（Step 3）
- Modify: `src/routes/api-routing.module.ts`

**Interfaces:**
- Produces: `ApiRoutingModule` は `ApiV3Module` だけを import する

- [ ] **Step 0: 消す前の孤児の一覧を取る**

元から import されずに使われているファイル（data-source・test-setup・models など）を基準として控える。v2 を消す**前**に流す。

```bash
BASELINE=1 python3 .context/find_orphans.py > .context/orphans_base.txt
```

- [ ] **Step 1: v2 のファイルを消す**

```bash
git rm -q \
  src/routes/api/v2/apiv2.module.ts \
  src/libs/agency/agency.v2.module.ts src/libs/agency/presentation/agency.v2.controller.ts src/libs/agency/usecase/agency.v2.service.ts \
  src/libs/calendar/calendar.v2.module.ts src/libs/calendar/presentation/calendar.v2.controller.ts src/libs/calendar/usecase/calendar.v2.service.ts \
  src/libs/formation/formation.v2.module.ts src/libs/formation/presentation/formation.v2.controller.ts src/libs/formation/usecase/formation.v2.service.ts \
  src/libs/operation-sighting/operation-sighting.v2.module.ts src/libs/operation-sighting/presentation/operation-sighting.v2.controller.ts src/libs/operation-sighting/usecase/operation-sighting.v2.service.ts \
  src/libs/operation/operation.v2.module.ts src/libs/operation/presentation/operation.v2.controller.ts src/libs/operation/usecase/operation.v2.service.ts \
  src/libs/route/route.v2.module.ts src/libs/route/presentation/route.v2.controller.ts src/libs/route/usecase/route.v2.service.ts \
  src/libs/service/service.v2.module.ts src/libs/service/presentation/service.v2.controller.ts src/libs/service/usecase/service.v2.service.ts \
  src/libs/station/station.v2.module.ts src/libs/station/presentation/station.v2.controller.ts src/libs/station/usecase/station.v2.service.ts \
  src/libs/trip-block/trip-block.v2.module.ts src/libs/trip-block/presentation/trip-block.v2.controller.ts src/libs/trip-block/usecase/trip-block.v2.service.ts src/libs/trip-block/usecase/trip-block.v2.service.spec.ts \
  src/libs/trip-class/trip-class.v2.module.ts src/libs/trip-class/presentation/trip-class.v2.controller.ts src/libs/trip-class/usecase/trip-class.v2.service.ts \
  src/libs/trip/trip.v2.module.ts src/libs/trip/presentation/trip.v2.controller.ts src/libs/trip/usecase/trip.v2.service.ts \
  src/libs/vehicle/vehicle.v2.module.ts src/libs/vehicle/presentation/vehicle.v2.controller.ts src/libs/vehicle/usecase/vehicle.v2.service.ts
```

確認: `find src -name '*v2*'` が何も出さない。

- [ ] **Step 2: ルーティングから ApiV2Module を外す**

`src/routes/api-routing.module.ts` を次にする（import 行と `imports` の配列から `ApiV2Module` を消す。ほかの行はそのまま）。

```ts
import { ApiV3Module } from './api/v3/apiv3.module';
// …（既存のほかの import はそのまま）
    imports: [ApiV3Module],
```

- [ ] **Step 3: 孤児になったファイルを消す**

2026-10-20 の下調べで、次の 6 つが v2 からしか使われていないと分かっている。v2 を消した今の木で、もう一度確かめる。

```bash
BASELINE=1 python3 .context/find_orphans.py > .context/orphans_after.txt
diff .context/orphans_base.txt .context/orphans_after.txt
```

Expected: `orphans_after` 側にだけ、次の 6 つが出る

```bash
git rm -q \
  src/core/utils/pagination-header.ts \
  src/libs/calendar/usecase/params/calendar-find-many-by-specific-date.param.ts \
  src/libs/formation/usecase/params/formation-find-many-by-specific-date.param.ts \
  src/libs/vehicle/infrastructure/builders/vehicle.dto.builder.ts \
  src/libs/vehicle/infrastructure/queries/vehicle.query.ts \
  src/libs/vehicle/vehicle.libs.module.ts
```

`VehicleModel` と `src/libs/vehicle/usecase/dtos/*` は formation が使うので残す。`vehicle.libs.module.ts` を消したので、`VehicleLibsModule` を import している所が残っていないか確かめる: `grep -rn "VehicleLibsModule" src` が 0 件。

- [ ] **Step 4: 全チェック**

Run: Global Constraints の「全チェック」3 つ
Expected: どれもエラー 0。jest は v2 の spec 1 本の分だけ件数が減る

- [ ] **Step 5: Commit**

```bash
git add -A src
git diff --cached --stat
git commit -m "refactor: :fire: api の v2 を消す

<Co-Authored-By と Claude-Session の 2 行>"
```

---

### Task 2: query・command から @dataui/crud を外す

**Files:**
- Modify: query 11 個 — `src/libs/{agency,calendar,formation,operation,operation-sighting,route,service,station,trip,trip-class,trip-block}/infrastructure/queries/*.query.ts`
- Modify: command 2 個 — `src/libs/operation-sighting/infrastructure/command/operation-sighting.command.ts`、`src/libs/trip-block/infrastructure/commands/trip-block.command.ts`
- Modify: spec 6 個 — `calendar.query.spec.ts`・`formation.query.spec.ts`・`operation.query.spec.ts`・`operation-sighting.query.spec.ts`・`trip-block.query.spec.ts`・`trip-class.query.spec.ts`
- Delete: `src/core/utils/merge-customizer.ts`（Step 4 で孤児になるのを確かめてから）

**Interfaces:**
- Consumes: Task 1 で v2 が消えていること（`CrudRequest` 用メソッドの呼び出し元が 0 件）
- Produces: どの query・command も `TypeOrmCrudService` を継承しない。コンストラクタ引数（`@InjectRepository(...)` の Repository など）は今のまま

- [ ] **Step 1: 継承を外す**

各ファイルで次の 3 か所を直す。例は `agency.query.ts`。

```ts
// 消す
import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';

// 前
export class AgencyQuery extends TypeOrmCrudService<AgencyModel> {
    constructor(
        @InjectRepository(AgencyModel)
        private readonly agencyRepository: Repository<AgencyModel>,
    ) {
        super(agencyRepository);
    }

// 後
export class AgencyQuery {
    constructor(
        @InjectRepository(AgencyModel)
        private readonly agencyRepository: Repository<AgencyModel>,
    ) {}
```

constructor に `super(...)` 以外の文がある場合は、その文を残して `super(...)` の行だけ消す（`service.query.ts` は引数が複数ある）。

- [ ] **Step 2: CrudRequest 用メソッドを消す**

次のメソッドを、JSDoc コメントを含めて丸ごと消す。

| ファイル | 消すメソッド |
|---|---|
| agency.query.ts | `findManyAgencies`（`query: CrudRequest` を受けるもの）・`findOneAgency` |
| calendar.query.ts | `CrudRequest` を受ける findMany 系（30 行目付近）・`findOneCalendar` |
| formation.query.ts | `findManyFormations`・`findOneFormation` |
| operation.query.ts | `CrudRequest` を受ける findMany 系（38 行目付近）・`findOneOperation` |
| operation-sighting.query.ts | `findManyOperationSightings`・`findManyLatestOperationSightingsGroupByOperation`・`findManyLatestOperationSightingsGroupByFormation`・`findOneOperationSighting` |
| operation-sighting.query.ts（呼び出し元 0 件） | `findOneLatestOperationSightingFromOperationNumber`・`findOneLatestOperationSightingFromOperationNumberAndSightingTimeRange`・`findOneLatestOperationSightingFromFormationNumber`・`findOneLatestOperationSightingFromFormationNumberAndSightingTimeRange` |
| route.query.ts | `CrudRequest` を受ける findMany 系（26 行目付近）・`findOneRoute` |
| service.query.ts | `CrudRequest` を受ける findMany 系（35 行目付近）・`findOneService` |
| station.query.ts | `CrudRequest` を受ける findMany 系（21 行目付近）・`findOneStation` |
| trip.query.ts | `CrudRequest` を受ける findMany 系（21 行目付近） |
| trip-class.query.ts | `CrudRequest` を受ける findMany 系（39 行目付近） |
| trip-block.query.ts | `CrudRequest` を受ける findMany 系（41 行目付近）・`findOneTripBlock` |
| operation-sighting.command.ts | `createOneOperationSighting` |
| trip-block.command.ts | `createManyTripBlocks`・`replaceOneTripBlock`・`deleteOneTripBlock`（`bulkCreate`・`replaceOneTripBlockByDomain`・`deleteOneTripBlockByDomain` は残す） |

消す前に、各メソッド名の呼び出し元が 0 件であることを確かめる（例: `grep -rn "\.findOneAgency(" src`）。`trip-block.v3.service.spec.ts` の `.replaceOneTripBlock(` と `.createManyTripBlocks(` は `TripBlockV3Service` のメソッドなので対象外。

- [ ] **Step 3: 継承元のメソッドが残っていないことを確かめる**

```bash
grep -rnE "this\.(repo|find|findOne|findOneBy|count|createBuilder|getMany|getOne|createOne|createMany|updateOne|replaceOne|deleteOne)\(" src/libs --include='*.query.ts' --include='*.command.ts'
grep -rn "@dataui\|CrudRequest\|GetManyDefaultResponse\|TypeOrmCrudService" src
```

Expected: どちらも 0 件。残った import（`isArray`・`mergeWith`・`Between`・`FindManyOptions` など）で使われなくなったものは、その import だけ消す（eslint の no-unused-vars で分かる）

- [ ] **Step 4: 孤児を消す**

```bash
BASELINE=1 python3 .context/find_orphans.py > .context/orphans_after2.txt
diff .context/orphans_base.txt .context/orphans_after2.txt
```

Expected: `orphans_after2` 側にだけ `src/core/utils/merge-customizer.ts` が出る（Task 1 の 6 つは消し済みなので、どちらにも出ない）。`merge-customizer.ts` を `git rm` する。ほかに増えたファイルがあれば、v3 から使われていないことを grep で確かめてから消す。

- [ ] **Step 5: spec のダミー metadata を外す**

上の spec 6 個のリポジトリモックから、`TypeOrmCrudService` のコンストラクタ用に置いた `metadata: { connection: { options: { type: 'postgres' } }, columns: [], primaryColumns: [], relations: [], targetName: '...' }` を消す。例（`trip-class.query.spec.ts`）:

```ts
// 前
const repository = {
    createQueryBuilder: jest.fn(() => qb),
    metadata: {
        connection: { options: { type: 'postgres' } },
        columns: [],
        primaryColumns: [],
        relations: [],
        targetName: 'TripClassModel',
    },
};

// 後
const repository = {
    createQueryBuilder: jest.fn(() => qb),
};
```

モックのほかのプロパティはそのまま。

- [ ] **Step 6: 全チェック**

Run: 「全チェック」3 つ
Expected: エラー 0。jest の件数は Task 1 の後と同じ

- [ ] **Step 7: Commit**

```bash
git add -A src
git diff --cached --stat
git commit -m "refactor: :recycle: query と command から @dataui/crud の継承を外す

<2 行>"
```

---

### Task 3: @dataui/crud を依存から外す

**Files:**
- Modify: `package.json`・`package-lock.json`

- [ ] **Step 1: 外す**

```bash
npm uninstall @dataui/crud @dataui/crud-request @dataui/crud-typeorm
```

（サンドボックス内で npm のキャッシュが読み取り専用なら `npm_config_cache="$TMPDIR/npm-cache"` を前に付ける）

- [ ] **Step 2: 残っていないことを確かめる**

```bash
grep -n "dataui" package.json
grep -c "node_modules/@dataui" package-lock.json
```

Expected: 1 つ目は何も出ない。2 つ目は `0`

- [ ] **Step 3: 全チェックとビルド**

Run: 「全チェック」3 つと `npm run build`
Expected: エラー 0

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: :heavy_minus_sign: @dataui/crud を依存から外す

<2 行>"
```

---

### Task 4: 手元の api を本番と突き合わせる

コードは変えない。結果は PR の本文に書く。

**Files:**
- Create: `.context/compare_local_prod.py`・`.context/v3_get_urls.sh`（git 管理外）

- [ ] **Step 1: 手元の api を新しいコードで起動する**

手元の api はコンテナ `sotetsu-lab-v3-api-development-api-1`（:3000、本番 DB を読む）。

```bash
docker restart sotetsu-lab-v3-api-development-api-1
docker logs --since 2m sotetsu-lab-v3-api-development-api-1
```

Expected: `error TS` が無く、Nest の起動ログ（`Nest application successfully started` など）が出る。DI の解決失敗（`Nest can't resolve dependencies`）が無い

- [ ] **Step 2: 本番ログから v3 の GET の URL を集める**

`.context/v3_get_urls.sh`:

```bash
#!/usr/bin/env bash
# 本番 api の 7 日分のログから、v3 の GET の URL を重複なしで集める（aws-vault exec administrator -- で流す）
set -eu
G=/aws/lambda/sotetsu-lab-v3-prod-api-lambda
END=$(date +%s)
START=$((END - 7 * 86400))
Q='fields @message
| filter @message like /"method":"GET"/ and @message like /"url":"\/v3\//
| parse @message /"url":"(?<url>[^"]+)"/
| stats count(*) as n by url
| sort n desc
| limit 300'
ID=$(aws logs start-query --log-group-name "$G" --start-time "$START" --end-time "$END" --query-string "$Q" --query queryId --output text)
for _ in $(seq 1 30); do
  sleep 2
  S=$(aws logs get-query-results --query-id "$ID" --query status --output text)
  [ "$S" = Complete ] && break
done
aws logs get-query-results --query-id "$ID" --output json > "$(dirname "$0")/v3_get_urls.json"
```

Run: `aws-vault exec administrator -- bash .context/v3_get_urls.sh`（サンドボックス外。MFA が切れていたらユーザーに `!` で認証してもらう）
Expected: `.context/v3_get_urls.json` に URL が 20 件以上

- [ ] **Step 3: 手元と本番に同じ URL を流して比べる**

`.context/compare_local_prod.py`:

```python
"""本番ログの v3 の GET を、手元（:3000）と本番に同じ匿名トークンで流し、状態コードと JSON を比べる。
時刻で変わる口（current-position(s)・time-cross-section）は差が出てよいので、状態コードだけ比べる。
トークンはファイルにも画面にも出さない。"""
import json
import os
import urllib.error
import urllib.request

H = os.path.dirname(__file__)
LOCAL = 'http://localhost:3000'
PROD = 'https://api.sotetsu-lab.com'
TIME_DEPENDENT = ('current-position', 'time-cross-section')


def token():
    with urllib.request.urlopen('https://v3.sotetsu-lab.com/api/auth/token') as r:
        return json.load(r)['accessToken']


def get(base, url, tok):
    req = urllib.request.Request(base + url, headers={'x-sotetsu-lab-authorization': f'Bearer {tok}'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, None


def main():
    tok = token()
    rows = json.load(open(os.path.join(H, 'v3_get_urls.json')))['results']
    urls = [next(c['value'] for c in r if c['field'] == 'url') for r in rows]
    same = diff = 0
    for u in urls:
        ls, lb = get(LOCAL, u, tok)
        ps, pb = get(PROD, u, tok)
        if ls != ps:
            print(f'STATUS {ls} != {ps}  {u}')
            diff += 1
        elif any(t in u for t in TIME_DEPENDENT) or lb == pb:
            same += 1
        else:
            print(f'BODY differs  {u}')
            diff += 1
    print(f'same={same} diff={diff} total={len(urls)}')


main()
```

Run: `python3 .context/compare_local_prod.py`（サンドボックス外。手元 :3000 と本番の両方に出るため）
Expected: `diff=0`。差が出た URL は、`git stash` で変更を外した手元の api（`docker restart` し直す）でも同じ差が出るか比べ、出るなら今回の変更のせいではない（本番の版が古い・データが動いた など）と判断して PR に書く

- [ ] **Step 4: /v2 が 404 になることを確かめる**

```bash
curl -s -o /dev/null -w '%{http_code} ' http://localhost:3000/v2/agencies
curl -s -D - -o /dev/null http://localhost:3000/v2/agencies
```

Expected: `404`。ヘッダーに `Cache-Control: no-store`

- [ ] **Step 5: trip-blocks の書き込みを確かめる**

保存テストに使ってよいのは「2021年10月JR渋谷駅工事臨時ダイヤ」（calendar_id `27792766-0031-4b89-9c32-23eea267cbbc`）だけ。テスト列番は `9999T`（事前に Supabase MCP の SELECT で、そのダイヤに無いことを確かめる）。

手元の client（`http://localhost:4200`、手元の api を向く）の「列車情報の入力」で、次の順に保存し、どれも成功の知らせが出て、保存後の画面と API の応答が合うことを見る。
1. 新規登録（`9999T`・2 駅以上の時刻）→ `POST /v3/trip-blocks/bulk`
2. 時刻を 1 つ変えて更新 → `PUT /v3/trip-blocks/:id`
3. 全線時刻表から列車の追加と削除 → `PATCH /v3/trip-blocks/:id/add-trip`・`delete-trip`

後始末の SQL をユーザーに渡して流してもらう（順は `trip_operation_lists` → `trips` → `trip_blocks`。対象は `9999T` の列車と、その trip_block だけ）。

- [ ] **Step 6: 目撃の POST の口が生きていることを確かめる**

本番 DB に目撃を残さないため、検証で 400 になる body を送る。

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -H "x-sotetsu-lab-authorization: Bearer $TOKEN" -d '{}' http://localhost:3000/v3/operation-sightings
```

（`TOKEN` は Step 3 と同じ方法で変数にだけ取る）
Expected: `400`（404 や 500 でない）

- [ ] **Step 7: CLI が起動することを確かめる**

```bash
npm run cli -- --help
```

Expected: `rebuildLatestCache` を含むヘルプが出て、DI のエラーが無い

---

### Task 5: 文書を直す

**Files:**
- Create: `docs/adr/0006-remove-v2-and-dataui-crud.md`
- Modify: `CLAUDE.md`（31・41・122・133 行目付近）
- Modify: `docs/refactor-instructions.md`（冒頭に注記）

- [ ] **Step 1: ADR を書く**

`docs/adr/0006-remove-v2-and-dataui-crud.md`（既存の ADR と同じ見出しの形に合わせる。`docs/adr/0005-supabase-auth.md` を参照）。中身:
- 状況: `@dataui/crud` は 2024-04 で更新停止。NestJS 11/12 に上げる前に外す必要がある
- 決定: `/v2/*` を廃止し、`@dataui/crud` 系 3 パッケージを外す。query・command は Repository＋`createQueryBuilder` だけで書く
- 根拠: spec 2 章の 3 点（どのリポも v2 を呼んでいない・本番ログ 30 日で v2 は確認用の curl だけ・Supabase Auth 切り替え後は v3 の client 以外 v2 を叩けない）
- 影響: `/v2/*` は 404。v3 は変わらない。版は v4.0.0

- [ ] **Step 2: CLAUDE.md を直す**

- 31 行目: `（v2・v3 API がある）` → `（v3 API）`
- 41 行目: 例を `operation-sighting.v3.module.ts` にする
- 122 行目: 「`TypeOrmCrudService` の `getMany` / `getOne` は新たに使わない（v2 用に残っているものを真似ない）」を削り、「`repository.find` / `findOne`（`relations` 付き）は新たに使わない」だけ残す
- 133 行目: `TypeOrmCrudService` のテスト用 metadata の注意書きを消す

- [ ] **Step 3: refactor-instructions.md に注記を足す**

1 行目の見出しの直後に次を足す（本文は履歴として残す）。

```markdown
> **2026-10-21 注記**: v2 は廃止し、`@dataui/crud` は依存から外した（ADR-0006）。以下の v2 に関する禁止事項・作業順序は当時のもの。
```

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0006-remove-v2-and-dataui-crud.md CLAUDE.md docs/refactor-instructions.md
git diff --cached --stat
git commit -m "docs: :memo: v2 廃止と @dataui/crud 撤去を ADR と CLAUDE.md に書く

<2 行>"
```

---

### Task 6: PR を出す

- [ ] **Step 1: push と PR**

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u https://github.com/kaito3desuyo/sotetsu-lab-v3-api.git refactor/remove-v2-and-dataui-crud
gh pr create -R kaito3desuyo/sotetsu-lab-v3-api -B master -H refactor/remove-v2-and-dataui-crud -t "v2 を廃止し @dataui/crud を外す" -F .context/pr_remove_v2.md
```

PR 本文（`.context/pr_remove_v2.md`）: 概要・消したもの・変えないもの・Task 4 の結果（`same/diff/total`・/v2 の 404・書き込みテスト・目撃 POST 400・CLI）・デプロイ（major v4.0.0、デプロイ後に v3 の確認スクリプト）。末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)` と Session URL。

- [ ] **Step 2: CI が通ることを確かめる**

Run: `gh pr checks <番号> -R kaito3desuyo/sotetsu-lab-v3-api --watch`
Expected: `test-and-lint` が pass

マージ・版上げ（`npm version major`）・デプロイはユーザーが行う。デプロイ後に `.context/prod_check_no_cognito.sh` を流し（v2 の行は 404 に変わる）、client の主な画面を見る。
