# v3 GET のブラウザ private キャッシュ（API 側）設計

- 日付: 2026-10-07
- 対になる spec: クライアント `sotetsu-lab-v3-client/docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`（画面内キャッシュの失効と、書き込み後の `cache: 'reload'`）
- 状態: レビュー待ち

## 目的

同じ利用者が同じ GET を何度も投げて、そのたびに Lambda と Supabase が動くのを減らす。
時刻表・運用表の画面を行き来するたびに trip-blocks（数 MB）を取り直しているのが一番重い（2026-10-07 の pg_stat_statements で trip-blocks が上位）。

## やらないこと（却下済み）

- **CloudFront で共有キャッシュする案（案 1）は採らない。** CloudFront のキャッシュはキーに認証ヘッダーを含まないため、キャッシュに当たった返答は AuthGuard を通らずに返る。認証の素通りになるので 2026-10-07 にユーザーが却下した。
- そのため、返答には必ず `private` を付ける。CloudFront には置かせず、利用者本人のブラウザにだけ覚えさせる。

## 今の状態

- v3 の GET はどれも `Cache-Control` を付けていない（v2 のコントローラーは `max-age=1, must-revalidate` を付けている）。
- `serverless.ts` の CloudFront キャッシュポリシーは `MinTTL: 1` / `DefaultTTL: 1`。AWS の文書によると、MinTTL が 0 より大きいと、CloudFront は `private` / `no-store` / `no-cache` の付いた返答でも最低その秒数はキャッシュする。
  - **つまり今も、全 GET が URL だけをキーに 1 秒間 CloudFront に置かれている。** 1 秒とはいえ、認証を通らずに返る穴がある。今回あわせて塞ぐ。
- GET の返答は利用者ごとに変わらない。どの GET にも `@RBAC` は無く、libs で `cognito_jwt_payload` を読む所も無い。だから、ブラウザに覚えさせても他人のデータが混ざることはない。

## 決めること

### 1. GET ごとの Cache-Control

対象は、クライアントが 2026-10-07 時点で使っている v3 の GET 28 本。

| 分類 | エンドポイント | Cache-Control |
|---|---|---|
| A マスタ | `GET /v3/agencies`、`/v3/routes`、`/v3/routes/:id/stations`、`/v3/services`、`/v3/services/:id/stations`、`/v3/services/:id/agencies`、`/v3/services/:id/routes`、`/v3/stations`、`/v3/trip-classes`、`/v3/operations/groups`、`/v3/calendars`、`/v3/calendars/:id` | `private, max-age=3600` |
| B 日付つきマスタ | `/v3/calendars/as/of/:date`、`/v3/calendar-dates`、`/v3/formations/as/of/:date`、`/v3/formations/from/:startDate/to/:endDate` | `private, max-age=3600` |
| C 時刻表 | `/v3/trip-blocks`、`/v3/trip-blocks/:id`、`/v3/operations/calendar/:calendarId`、`/v3/operations/calendar/:calendarId/trips`、`/v3/operations/:id/trips`、`/v3/operations/from/:start/to/:end` | `private, max-age=600` |
| D リアルタイム | `/v3/operation-sightings/from/:start/to/:end`、`/v3/operation-sightings/time-cross-section/operation-numbers`、`/v3/operation-sightings/time-cross-section/formation-numbers`、`/v3/operation-sightings/time-cross-section/operation-number/:operationNumber`、`/v3/operations/current-positions`、`/v3/operations/:id/current-position` | `no-store` |

- クライアントが使っていない `GET /v3/trips/station/:stationId` と `GET /v3/operation-sightings/time-cross-section/formation-number/:formationNumber` は、付けずに今のままにする。
- 秒数の根拠:
  - A・B はアプリから書き込む手段が無い。DB を直に直したときは、最大 1 時間古いものが見える。
  - C はクライアントの列車情報の入力から書き換わる。書いた本人は、クライアント側の `cache: 'reload'` で古いものを見ない（対の spec）。他の利用者は最大 10 分遅れる。
  - D は数秒単位で変わり、real-time が自分で取り直すので、覚えさせない。
- POST / PUT / PATCH には何も付けない。

### 2. 付け方: 成功した返答にだけ付ける

- Nest の `@Header()` は使わない。`@Header()` は guard の後、handler を呼ぶ前に付く（`router-execution-context.js` で確認）。そのため、handler が例外を投げた 404 や 500 にも `max-age=3600` が残り、ブラウザが失敗を 1 時間覚えてしまう。
- 代わりに、`src/core/` に次の 2 つを置く。
  - デコレーター `@CacheControl(value: string)`: メタデータを付けるだけ。
  - interceptor `CacheControlInterceptor`: `Reflector` でメタデータを読み、handler の Observable が値を流したときだけ `res.setHeader('Cache-Control', value)` する。例外の経路では付かない。
- interceptor は `app.ts` で `useGlobalInterceptors` に登録する。メタデータの無い handler では何もしない。
- 値は文字列を直書きせず、`src/core/configs/cache-control.ts` に定数として置く。

  ```ts
  export const CACHE_CONTROL = {
      MASTER: 'private, max-age=3600',
      TIMETABLE: 'private, max-age=600',
      REALTIME: 'no-store',
  } as const;
  ```

- 例外フィルターは手を入れない。interceptor が成功時にしか付けないので、エラーの返答には最初から Cache-Control が付かない。

### 3. CloudFront の TTL を 0 にする

- `serverless.ts` のキャッシュポリシーを `MinTTL: 0` / `DefaultTTL: 0` にする（`MaxTTL` は今のまま）。
- こうすると、`private` / `no-store` の付いた返答と Cache-Control の無い返答は CloudFront に置かれない。上の「1 秒の穴」が塞がる。
- 本番の CloudFront の設定変更なので、デプロイはユーザーが行う。
- 影響:
  - 同じ URL を 1 秒以内に何人かが同時に取ったとき、今は CloudFront がまとめていた。それが無くなり、全部 Lambda まで届く。
  - real-time は利用者ごとに時刻のパラメータが違うので、今もほぼまとまっていないはずだ。増える分は小さいと見ている（デプロイ後に Lambda の起動回数で確かめる）。

## テスト

- `CacheControlInterceptor` の spec: supertest とダミーのコントローラーで次の 3 点を確かめる。書き方は `cors-options.spec.ts` と同じ。
  - 成功した GET に指定の値が付く。
  - handler が `NotFoundException` を投げたら付かない。
  - メタデータの無い handler には付かない。
- 各コントローラーの GET に、表の値が付いていること:
  - コントローラーの spec で、`Reflector` を使ってメタデータを見る。
  - または、表を基準にした 1 本の網羅 spec で確かめる。どちらにするかは実装計画で決める。
- `serverless.ts` の TTL は、デプロイ後に本番で確かめる。`curl -I` で `x-cache` が毎回 `Miss from cloudfront` になることを見る。

## 効果の測り方

- デプロイ前後で次の 2 つを比べる。
  - Lambda `sotetsu-lab-v3-prod-api-lambda` の 1 時間あたりの Invocations。比べ元は 10/6 朝の 7〜16 千回。
  - `extensions.pg_stat_statements` の trip-blocks の calls。
- クライアントの一部の版は 1 本ずつ取りを続けている（2026-10-07 に確認）。これは版が入れ替わるまで残るので、差し引いて見る。

## 出す順番

- クライアントの spec を先に出し、この API の spec はその後に出す。
- 逆に API だけが先に入ると、列車情報を書いた本人が、ブラウザに残った保存前の時刻表を最大 10 分見てしまう。

## 決まっていないこと

- 秒数（A・B は 1 時間、C は 10 分）は、ユーザーのレビューで変えてよい。
