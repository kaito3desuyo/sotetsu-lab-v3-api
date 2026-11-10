# ADR-0016: UUID でない入力を 4xx で返し、アラームを api のスタックに置く（M19）

- **日時**: 2026-11-10
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（コードはコミット済み。版上げ・デプロイ・本番での確かめはまだ）
- **ブランチ**: feature/m19-monitoring
- **spec**: docs/superpowers/specs/2026-11-10-m19-monitoring-design.md
- **関連**: ADR-0011（id の path param を UUID として検める）、monitoring リポの ADR-0001（見張りの共通部分は CDK、アラームはアプリ側）

---

## 背景

- M19 で CloudWatch アラームを Discord に流す。ただし api は、UUID でない値が来ると SQL で `QueryFailedError: invalid input syntax for type uuid`（`22P02`）になり、500 を返していた。
- 30 日（10/11〜11/10）の実測。`Url5xxCount` が 1 時間に 5 件以上になったのは 5 時間あり、5 時間とも原因は `22P02` で、障害ではなかった。
  - 内訳はスクリプト 3 回と、client の `calendarId=undefined` 2 回。
- このままアラームを入れると空振りで鳴り、ユーザーは通知を切る。先に 500 を 4xx にする。
- ADR-0011 は id の path param に `@IsUUID()` を付けた。ただしクエリ（`calendarId`）には付いていない口が残っていた。

## 決定

### 1. UUID でない入力は 4xx で返す

- **DTO で弾く:** `TripBlockFindManyByFilterQuery.calendarId`・`TripFindManyByStationIdQuery.calendarId` の `@IsString() @IsNotEmpty()` を `@IsUUID()` に置き換えた。グローバルの ValidationPipe により **422**（ADR-0011 と同じ）。
- **網で拾う:** `InvalidTextRepresentationFilter`（`@Catch(QueryFailedError)`）を `src/app.ts` に足した。`driverError.code` が `22P02` なら warn ログ＋ **400**（`{ statusCode: 400, message: '入力の形が正しくありません' }`）。将来の経路の取りこぼしを拾う。
- **`22P02` 以外の `QueryFailedError` は 500 のまま。** 本文は `{ statusCode: 500, message: 'Internal server error' }`、ログは error（stack 付き）。本物の 500 を隠さない。
- `UseCaseError`・`UnexpectedError` は既存の filter が拾い続ける。
- 30 日で来た経路（trip-blocks・calendars・operations・trips/station・routes・services）は、`src/libs/*/usecase/params/` を洗い出して確かめた。calendarId のクエリ 2 つ以外は ADR-0011 で塞がっていた。

### 2. アラームを api のスタックに置く

- `serverless.ts` の `resources` に 2 本。生成は汎用の `serverless-alarms.ts`（`lambdaAlarms()`）。他の 3 リポにも同じ形で複製する。
  - `sotetsu-lab-v3-prod-api-url5xx`: `Url5xxCount` が 1 時間に 5 件以上
  - `sotetsu-lab-v3-prod-api-errors`: `Errors` が 1 時間に 3 件以上
- 共通のきまり: `Period: 3600`・`EvaluationPeriods: 1`・`Statistic: Sum`・`GreaterThanOrEqualToThreshold`・`TreatMissingData: notBreaching`。`AlarmActions` と `OKActions` に SNS。
- 本番だけに掛ける: Condition `IsProd`（stage が `prod` のとき）。
- SNS の ARN は SSM `${ssm:sotetsu-lab-v3-${sls:stage}-monitoring-alarm-topic-arn, ''}` で読む。monitoring がトピックを作って ARN を書く側。
- **デプロイ順は monitoring → api。** monitoring は 2026-11-10 にデプロイ済み。400 化が本番に出る前にアラームが先に出てはいけない。今回は同じリリースに入れる。

## 実装で分かったこと

- `tsconfig.build.json` の `exclude` に `serverless-alarms.ts` が要った。無いと `npm run build` が TS6059（rootDir の外）で落ちる。`serverless.ts` と同じ扱い。
- 作業中に `serverless-alarms.{js,d.ts,js.map}` が作業ツリーに出た。osls は `.ts` を tsx で読むだけでファイルを出さないので、`exclude` を足す前の `npm run build`（tsc）の残骸と見ている（推定・未再現）。Lambda の zip は `dist/**` だけなので混ざらない。
- 22P02 を別の例外に包んで投げ直す経路は無かった。リポジトリ層で `QueryFailedError` はそのまま伝わるので、filter 1 本で足りた。
- 素の `@Query('x')` / `@Param('x')` で受けていて DTO 化しなかった口（calendar-date の `calendarId`、trip-class の `serviceId`、operation の `operationIds`）は、網（400）に任せた。範囲を広げないため。
- `NextOperationCandidatesQuery.stationId`（`@IsString()`）には `@IsUUID()` を付けなかった。メモリ上の比較にしか使わず DB に渡らないため。

## 既知の未対処（網で拾えず 500 のまま）

30 日の実測で鳴ったのは `22P02` だけなので、次は塞がずに残す。鳴ったら、そのとき塞ぐ。

- 日付の素の口に日付でない値：`22007`/`22008` で 500（calendar.query.ts:64、formation.query.ts:190、operation.query.ts:53）。
- operation-sighting.query.ts:22：不正な日付で `RangeError`、500。
- 数値の範囲外（`22003`）と、`operationIds` を配列で送ったとき（どちらも推定・未実測）。

## 却下した案

- 網だけ（DTO を足さない）。入口で弾くほうが 422 の本文でどの列が悪いか分かる。
- DTO だけ（網なし）。素の `@Query` の口と将来の経路が 500 のまま残る。
- `QueryFailedError` を全部 400 にする。本物の DB 障害を隠す。
- 空振りを許してアラームの閾値を上げる。閾値を上げると本物の障害も遅れる。

## 結果

- 4xx は `Url5xxCount` に数えられない（想定）。
- 単体テスト: DTO の spec（`undefined`・`not-a-uuid`・`123` で calendarId にエラー、UUID は通る）と filter の spec 3 件。全体 103 files / 1102 tests passed（Task 2 時点）。
- 手元の api（`dev-reporter` で認証）に curl して確かめた（2026-11-10）。`/v3/trip-blocks?calendarId=undefined` → 422、`/v3/calendars/not-a-uuid` → 422、`/v3/trips/station/not-a-uuid?calendarId=undefined` → 422、素の `@Query` の `/v3/calendar-dates?calendarId=undefined` → 400（網）。`/v3/calendar-dates`（値なし）は 200 のまま。
- `osls package` で CloudFormation テンプレートに 2 本のアラーム（Condition IsProd・閾値・SNS の ARN）が出ることを確かめた。

## 未確認

- 本番での確かめ（版上げ・デプロイは未）:
  - `calendarId=undefined` を 1 回送り、422 になる。
  - `aws cloudwatch set-alarm-state` で 2 本とも ALARM にし、Discord に「障害発生」が届く。次の評価で OK に戻り「復旧」が届く。
- e2e（`test/`）は DB が要るので流していない。
- 呼び出し側（client）が UUID 以外を送っていれば、これまでの 500 が 422 に変わる。それが狙い。
