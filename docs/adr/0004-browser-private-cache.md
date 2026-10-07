# ADR-0004: v3 GET の返答をブラウザにだけ覚えさせる（private の Cache-Control）

- **日時**: 2026-10-07
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feat/browser-private-cache

---

## 背景

- 同じ利用者が同じ GET を何度も投げ、そのたびに Lambda と Supabase が動いていた。時刻表・運用表の画面を行き来するたびに取り直す trip-blocks（数 MB）が一番重い（2026-10-07 の pg_stat_statements で上位）。
- v3 の GET はどれも `Cache-Control` を付けていなかった。
- CloudFront のキャッシュポリシーは `MinTTL: 1` / `DefaultTTL: 1` だった。MinTTL が 0 より大きいと、CloudFront は `private` / `no-store` の返答でも最低その秒数は置く。つまり全 GET が URL だけをキーに 1 秒間 CloudFront に置かれ、その間は認証を通らずに返る穴があった。

## 決定

- クライアントが使っている v3 の GET 28 本に、成功した返答にだけ `Cache-Control` を付ける。値は `CACHE_CONTROL` の 3 種類だけ。
  - マスタ・日付つきマスタ: `private, max-age=3600`
  - 時刻表（trip-blocks・運用の時刻表系）: `private, max-age=600`
  - リアルタイム（目撃・時刻断面・現在位置）: `no-store`
- 部品は RBAC と同じく `src/core/modules/cache-control/` にまとめ、`CacheControlModule` を `AppModule` で読み込む。モジュールが interceptor（`APP_INTERCEPTOR`）とミドルウェア（`forRoutes('*')`）を自分で掛けるので、`app.ts` は触らない。
- 付け方は `@CacheControl(value)` でメタデータを付け、`CacheControlInterceptor` が書く。
  - 書くかどうかは、ヘッダーを送り出す直前に状態コードで決める（2xx のときだけ）。直前に処理を差し込むのに `on-headers`（jshttp、express の部品）を直接の依存に足した。脆弱性の直った 1.1.0 以上。
  - handler が値を返した時点で書くと、そのあと JSON にする段階で落ちた 500 にも `max-age` が残り、ブラウザが失敗を覚えてしまうため。
- エラーの返答（400 以上）は、どの経路でも `Cache-Control: no-store` にする。ミドルウェア `noStoreOnError` を全ルートに掛ける。
  - Cache-Control が無いと、CloudFront は 404・414・5xx を既定で 10 秒キャッシュし（error caching minimum TTL）、同じ URL の全員に返す。
  - guard（401/403）や ValidationPipe（400）の返答は interceptor を通らないので、interceptor ではなくミドルウェアにした。v2 のエラーにも効く。
- CloudFront のキャッシュポリシーは `MinTTL: 0` / `DefaultTTL: 0` にする。`MaxTTL` はそのまま。

## 却下した案

- **CloudFront で共有キャッシュする**
  - キャッシュキーに認証ヘッダーが入らないので、当たった返答は AuthGuard を通らずに返る。認証の素通りになるため、ユーザーが却下した。
- **Nest の `@Header()` で付ける**
  - `@Header()` は handler を呼ぶ前に付くので、handler が例外を投げた 404 や 500 にも `max-age` が残り、ブラウザが失敗を覚えてしまう。
- **例外フィルターの側で Cache-Control を消す**
  - 既存の 2 つのフィルターに加えて、ほかの例外を受ける catch-all を作り、3 か所で消すことになる。フィルターが増えるたびに消し忘れのおそれが出る。
- **CloudFront の `CustomErrorResponses` で `ErrorCachingMinTTL` を 0 にする**
  - Nest を通らない 5xx（Lambda のタイムアウト・起動失敗）まで確実に止められる。それでも、返答を作った側が `no-store` と言うミドルウェアだけにすると、ユーザーが決めた（2026-10-07）。
  - そのため、Nest を通らない 5xx は、これまでどおり CloudFront に 10 秒置かれうる。

## 結果

- 返答は `private` なので、利用者本人のブラウザにだけ置かれる。GET の返答は利用者ごとに変わらない（`@RBAC` も JWT の中身を読む所も無い）ので、他人のデータが混ざることはない。
- 列車情報を書いた本人の鮮度は、クライアント側で担保する。書き込みが成功したら画面内キャッシュを捨て、10 分間は時刻表系の GET を `cache: 'reload'` で取る（sotetsu-lab-v3-client の `docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`・ADR-0002）。他の利用者は最大 10 分遅れる。
- そのため、出す順はクライアントが先で、API が後。
- 時刻表の 600 秒は、クライアントの `RELOAD_WINDOW_MS.timetable` と同じでなければならない。
- 塞がるのは v3 だけ。v2 の GET は AuthGuard を通すのに `private` の無い `max-age=2592000` / `max-age=1` を返しており、`MaxTTL` を残すので、CloudFront は引き続き URL だけをキーに最長 30 日置いて、認証なしで返す。2026-10-07 時点の client は v2 を呼んでいない。v2 の扱い（`private` を足す・v2 をやめる）は別の PR で決める。
