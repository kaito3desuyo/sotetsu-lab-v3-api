# M19 障害の見張り（api の分）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UUID の形でない入力で 500 を返さないようにしてから、api の Lambda に 2 本のアラームを掛ける。

**Architecture:** 入口の DTO に `@IsUUID()` を足し（ValidationPipe の 422）、取りこぼしは `QueryFailedError` の `22P02` だけを 400 にする例外フィルタで拾う。アラームは `serverless.ts` の `resources` に、monitoring が SSM に置いた SNS の ARN を向けて足す。

**Tech Stack:** NestJS 12 / class-validator / TypeORM 1.x / Vitest / osls 3.x

**Spec:** `docs/superpowers/specs/2026-11-10-m19-monitoring-design.md`（全体は monitoring リポの同名の spec）

## Global Constraints

- SNS の ARN は `${ssm:sotetsu-lab-v3-monitoring-alarm-topic-arn, ''}` で読む（monitoring の計画で決めた名前）。
- アラームは `Period: 3600`・`EvaluationPeriods: 1`・`Statistic: Sum`・`ComparisonOperator: GreaterThanOrEqualToThreshold`・`TreatMissingData: notBreaching`、`AlarmActions` と `OKActions` に ARN。
- アラーム名：`sotetsu-lab-v3-prod-api-url5xx`（`Url5xxCount` ≥ 5）、`sotetsu-lab-v3-prod-api-errors`（`Errors` ≥ 3）。説明は日本語で、何が起きたかを 1 文。
- 入力の検証で落ちたものは、今までどおり ValidationPipe の 422。網で拾った `22P02` は 400。どちらも 4xx なので `Url5xxCount` に数えられない。
- `22P02` 以外の `QueryFailedError` は 500 のまま（Nest の既定と同じ本文 `{ statusCode: 500, message: 'Internal server error' }`）でログにも残す。本物の 500 を隠さない。
- テスト・CLI はサンドボックスの外で流す（SWC。api の CLAUDE.md）。
- コミットは api の CLAUDE.md の形（Conventional Commits＋絵文字・日本語・機能と docs/ADR を分ける）。末尾の 2 行は monitoring の計画と同じ。

## Review Focus

- `calendarId=undefined` のようにクエリで来る UUID → 4xx。Task 1 のテスト `calendarId が UUID でなければ 422` で押さえる。
- DTO で検めていない口（`@Query('calendarId') calendarId?: string` のような素の文字列）に UUID でない値 → 網で 400。Task 2 のテスト `22P02 は 400` で押さえる。
- 一意制約違反など、`22P02` 以外の DB エラー → 500 のまま。Task 2 のテスト `22P02 以外は 500` で押さえる。
- `UseCaseError`・`UnexpectedError` は今までの filter が拾い続ける。Task 2 のテスト `QueryFailedError 以外は拾わない`（`@Catch(QueryFailedError)` であること）で押さえる。
- stage が prod 以外の api は作らないが、アラームに `IsProd` の Condition を付けておく（4 リポで同じ形）。Task 3 の確かめで押さえる。

---

### Task 1: 入口の DTO で UUID を検める

**Files:**
- Modify: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts`（`calendarId` を `@IsUUID()` に）
- Modify: そのほか、UUID を受ける `*Param`・`*Query` のクラスで `@IsUUID()` が無いもの（下の Step 1 で洗い出す）
- Test: 直したクラスごとに隣の `*.spec.ts`（`calendar-id.param.spec.ts` の書き方にそろえる）

- [ ] **Step 1: 洗い出す。** `src/libs/*/usecase/params/` と、コントローラが `@Param()`・`@Query()` で受けるクラスのうち、UUID の列（`id`・`calendarId`・`serviceId`・`operationId` など）に `@IsUUID()` が無いものを列挙する。2026-10 に 500 になった経路（`/v3/trip-blocks?calendarId=`・`/v3/calendars/:id`・`/v3/operations/calendar/:id`（`/trips`）・`/v3/trips/station/:id`・`/v3/trip-blocks/:id`・`/v3/operations/:id/trips`・`/current-position`・`/v3/routes/:id/stations`・`/v3/services/:id/stations`・`/routes`）は必ず入れる。素の `@Query('x') x?: string` で受けている口（`calendar-date` の `calendarId`、`trip-class` の `serviceId`、`operation` の `operationIds` など）は DTO 化しない（範囲を広げない）。Task 2 の網に任せる。
- [ ] **Step 2: 落ちるテストを書く**（クラスごと）: `calendarId が UUID でなければ 422`（`validate(plainToInstance(Cls, { calendarId: 'undefined', tripDirection: 0 }))` にエラーがある）と、正しい UUID なら通ること。
- [ ] **Step 3: 落ちることを確かめる** — `npm run test -- <spec>` → FAIL
- [ ] **Step 4: `@IsUUID()` を足す。**
- [ ] **Step 5: 通ることを確かめる** — `npm run test` → 全部 PASS
- [ ] **Step 6: コミット** — `fix: :bug: UUID を受ける入口で形を検める`

### Task 2: `22P02` を 400 にする網

**Files:**
- Create: `src/core/filters/invalid-text-representation.filter.ts`
- Modify: `src/app.ts`（`app.useGlobalFilters(new InvalidTextRepresentationFilter())` を足す）
- Test: `src/core/filters/invalid-text-representation.filter.spec.ts`

**Interfaces:**
- Produces: `@Catch(QueryFailedError) class InvalidTextRepresentationFilter implements ExceptionFilter { catch(exception: QueryFailedError, host: ArgumentsHost): void }`

- [ ] **Step 1: 落ちるテストを書く**（`ArgumentsHost` と `Response` は偽物）
  - `22P02 は 400`: `driverError.code === '22P02'` → `status(400)`、本文 `{ statusCode: 400, message: '入力の形が正しくありません' }`。ログは `warn`（障害でないので error にしない）。
  - `22P02 以外は 500`: `code === '23505'` → `status(500)`、本文 `{ statusCode: 500, message: 'Internal server error' }`、`Logger.error` に元の例外。
  - `QueryFailedError 以外は拾わない`: `Reflect.getMetadata('__filterCatchExceptions__', InvalidTextRepresentationFilter)` が `[QueryFailedError]`。
- [ ] **Step 2: 落ちることを確かめる** — FAIL
- [ ] **Step 3: filter を書き、`app.ts` に登録する。**
- [ ] **Step 4: 通ることを確かめる** — `npm run test` → PASS
- [ ] **Step 5: 手元で確かめる** — 手元の api（docker・api の CLAUDE.md）に `curl -s -o /dev/null -w '%{http_code}' 'http://localhost:3011/v3/trip-blocks?calendarId=undefined&tripDirection=0'` → `422`。素の文字列の口（例 `/v3/calendar-dates?calendarId=undefined`。実際のパスはコントローラで確かめる）→ `400`。手元の api の古いビルドに注意（docker logs → restart）。
- [ ] **Step 6: コミット** — `fix: :bug: UUID の形でない値で 500 を返さない`

### Task 3: アラーム

**Files:**
- Create: `serverless-alarms.ts`（4 リポで同じ中身）
- Modify: `serverless.ts`（`resources.Conditions` と `resources.Resources` に混ぜる）

**Interfaces:**
- Produces（`serverless-alarms.ts`）:
  - `const ALARM_TOPIC_ARN = "${ssm:sotetsu-lab-v3-monitoring-alarm-topic-arn, ''}"`
  - `interface LambdaAlarm { logicalId: string; alarmName: string; description: string; functionLogicalId: string; metricName: 'Errors' | 'Url5xxCount'; threshold: number }`
  - `function lambdaAlarms(alarms: LambdaAlarm[]): { Conditions: { IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] } }; Resources: Record<string, unknown> }` — 各アラームは `Type: 'AWS::CloudWatch::Alarm'`・`Condition: 'IsProd'`、`Dimensions: [{ Name: 'FunctionName', Value: { Ref: functionLogicalId } }]`、`Namespace: 'AWS/Lambda'` と Global Constraints の値。

- [ ] **Step 1: `serverless-alarms.ts` を書き、`serverless.ts` で使う。** api の関数は `app` なので `functionLogicalId: 'AppLambdaFunction'`。
  - `ApiUrl5xxAlarm`：`sotetsu-lab-v3-prod-api-url5xx`・`Url5xxCount`・5・「api が 1 時間に 5xx を 5 件以上返した」
  - `ApiErrorsAlarm`：`sotetsu-lab-v3-prod-api-errors`・`Errors`・3・「api の Lambda が 1 時間に 3 回以上エラーで終わった（タイムアウトを含む）」
- [ ] **Step 2: 確かめる** — `npm run build && aws-vault exec administrator -- npx osls package` → `.serverless/cloudformation-template-update-stack.json` に 2 本のアラームがあり、`Dimensions` の `Ref` の先（`AppLambdaFunction`）がテンプレートに実在し、`AlarmActions` が `arn:aws:sns:ap-northeast-1:442730633672:sotetsu-lab-v3-prod-monitoring-alarm-topic`。monitoring がまだデプロイされていなければ `''` になるので、その場合は monitoring のデプロイを待つ。
- [ ] **Step 3: コミット** — `feat: :sparkles: api の Lambda にアラームを掛ける`

### Task 4: ADR・リリース・実地の確かめ

- [ ] **Step 1: ADR を書く**（`docs/adr/` の次の番号）。「UUID でない入力を 4xx で返す（DTO は 422・網は 400）」と「アラームを api のスタックに置く」。30 日の実測（5 時間の空振りが全部 `22P02`）を根拠に書く。
- [ ] **Step 2: コミット** — `docs: :memo: ADR に M19 の判断を書く`
- [ ] **Step 3: 版を上げてデプロイ**（api の版上げとデプロイのいつもの手順。push とデプロイはユーザーの明示の指示を待つ）。monitoring が先にデプロイ済みであること。
- [ ] **Step 4: 実地で確かめる** — 本番に `calendarId=undefined` を 1 回送る → 422。`aws cloudwatch set-alarm-state --alarm-name sotetsu-lab-v3-prod-api-url5xx --state-value ALARM --state-reason テスト` → Discord に「鳴った」。次の評価で OK に戻り「直った」が届く。`-errors` も同じ。
