# M19 障害の見張り（api の分）設計

2026-11-10。全体の形・実測・決まったことは monitoring リポの `docs/superpowers/specs/2026-11-10-m19-monitoring-design.md` にある。ここには api でやることだけを書く。

## なぜ

本番が落ちても気づけないので、CloudWatch アラームを Discord に流す。ただし今の api は、UUID の形でない値が来ると SQL で `QueryFailedError: invalid input syntax for type uuid` になり、500 を返す。30 日（10/11〜11/10）で `Url5xxCount` が 1 時間に 5 件以上になったのは 5 時間あったが、5 時間ともこれが原因で、障害ではなかった。内訳はスクリプト 3 回と、client の `calendarId=undefined` 2 回。このままアラームを入れると空振りで鳴り、ユーザーは通知を切る。

## やること

1. **UUID の形でない値は 400 で返す**
   - パスでもクエリでも、DB に届く前に 400 にする。
   - 30 日で実際に来た経路は必ず塞ぐ。
     - `/v3/trip-blocks?calendarId=`
     - `/v3/calendars/:id`
     - `/v3/operations/calendar/:id` と `/trips`
     - `/v3/trips/station/:id`
     - `/v3/trip-blocks/:id`
     - `/v3/operations/:id/trips`・`/current-position`
     - `/v3/routes/:id/stations`
     - `/v3/services/:id/stations`・`/routes`
   - 塞ぎ方は 2 つとも入れる（2026-11-10 の読み合わせで決めた）。
     - 足りない DTO に `@IsUUID()` を足して、今ある経路の入口で弾く。
     - `QueryFailedError` の `22P02`（`invalid_text_representation`）を 400 に変える網を張って、将来の経路の取りこぼしを拾う。
   - 網が 400 にするのは `22P02` だけ。それ以外の `QueryFailedError` は今までどおり 500 にして、`UnexpectedErrorFilter` が拾っていた本物の 500 を隠さない。
   - e2e テストは、上に列挙した経路について書く。
2. **アラームを 2 本足す**（`serverless.ts` の `resources`）
   - `api-lambda` の `Url5xxCount`：1 時間に 5 件以上
   - `api-lambda` の `Errors`：1 時間に 3 件以上
   - 共通のきまり（1 時間・Sum・`notBreaching`・`AlarmActions` と `OKActions` に SNS）は monitoring の設計に従う。
   - SNS トピックの ARN は `${ssm:...}` で読む。パラメータ名は monitoring の実装で決まる。
   - api の stage は `prod` に固定されているので、本番だけにする分岐は要らない。

## 順番

1. の 400 化を出してから 2. のアラームを入れる。同じリリースでもよいが、アラームが先に本番に出てはいけない。monitoring のデプロイが 2. より先に要る。

## 終わりの条件

- UUID でない値を送ると 400 が返り、ログに `QueryFailedError` が出ない（spec と、本番での確認）。
- `aws cloudwatch set-alarm-state` で 2 本とも ALARM・OK を切り替え、Discord に届く。

## ADR

`docs/adr/` に「UUID でない入力を 400 で返す」と「アラームを api のスタックに置く」を残す。
