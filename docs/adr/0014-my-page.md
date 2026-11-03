# ADR-0014: マイページ（M13 の api の分）— 本人の要約・一覧と「裏付け」の判定

- **日時**: 2026-11-03
- **Agent**: claude-sonnet-5
- **ステータス**: 採用済み（本番へのデプロイ前）
- **ブランチ**: feature/m13-sighting-call-and-my-page
- **spec**: docs/superpowers/specs/2026-11-03-my-page-design.md（計画: docs/superpowers/plans/2026-11-03-my-page.md）

---

## 背景

- 2026-11-06 21:00 に目撃の投稿を登録者だけにする（登録制②・ADR-0009）。登録してくれた人に、投稿を続ける理由を返したい。
- 自分が出した目撃が何件あり、他の人の目撃と食い違っていないかが見えれば、続ける張り合いになり、間違いにも自分で気づける。
- ロードマップでは「当たっていたか」と書いたが、正解の表は無い。分かるのは、他の人の目撃と合うかどうかだけ。ユーザーは設計を任せた。spec は 2026-11-03 にユーザーが承認した。

## 決定

### 口の置き場

- 本人だけが読める口を 2 本、`/v3/users/me` の下に足す。書き込みは無い。
  - `GET /v3/users/me`: 本人の要約（投稿数・無効にされた数・裏付けの内訳・最初と最後の投稿日時）。
  - `GET /v3/users/me/operation-sightings?limit=&before=`: 本人の投稿の一覧（新しい順・キーセット）。1 件ごとに裏付けの判定を付ける。
- 置き場は既存の `UserV3Controller`（`src/libs/user/presentation/user.v3.controller.ts`）。`@Get('/:userId')` より前に宣言する。`/:userId` は uuid の検めがあるので、順序を誤っても `me` は 400 になる。順番で食い合わせを避ける。
- 本人の id は `req.auth.userId` だけから取る。URL にも query にも userId を書かせないので、他人の id を入れて読む道が無い。
- 役割は `@RBAC(Role.REPORTER, Role.EDITOR, Role.MANAGER)`。viewer（BAN 済み）は今の RBACGuard のとおり 403。ゲスト（役割なし）も 403。
- 応答は `@CacheControl(CACHE_CONTROL.REALTIME)`（no-store）。個人のデータなので CDN にもブラウザにも残さない。
- 要約は `MySummaryDto`（`src/libs/user/usecase/dtos/my-summary.dto.ts`）。管理者向けの `UserSummaryDto` と別に作り、`username`・`role`・`banned` を持たせない。本人は認証で自分が分かり、BAN 済みは入れないので、BAN の真偽などは本人に返さない。
  - 投稿数・無効数・最初と最後の日時は `UserV3Service.findUserSummary`（M18）を使い回す。
- 一覧は `MyOperationSightingDto`（`src/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto.ts`）。`OperationSightingSummaryDto` を継いで `corroboration` を足す。管理者向けの `/v3/users/:userId/operation-sightings` の形は変えない。

### 裏付けの定義と言葉

- 画面の言葉は「裏付け」。「当たり・外れ」とは呼ばない。
- 値は 4 つ（`SightingCorroborationValue`）。
  - `corroborated`（裏付けあり）: 他の目撃の運用番号に、本人と同じものが 1 件でもある。
  - `conflicting`（食い違い）: 他の目撃はあるが、本人と同じ運用番号が 1 件も無い。
  - `uncorroborated`（他の目撃なし）: 他の目撃が 1 件も無い。
  - `invalidated`（無効）: 本人の投稿が無効にされている。他の目撃は見ず、判定しない。
- 「他の目撃」の範囲は次のとおり。
  - 同じ運行日。4 時が境目（日本時間で 4 時間引いた日付）。
  - 同じ編成。
  - 本人以外。author 行の `user_id` が本人でないもの、と author 行の無いもの（ゲスト・記録を始める前の投稿。author 行の最古は 2026-10-24 05:02 JST）。ゲストの目撃も裏付けに数える。本人の別の投稿は含めないので、それしか無ければ「他の目撃なし」。
  - 有効なものだけ。他の人の無効な目撃は材料に入れない。
- 時刻の前後は問わない。前の目撃も後の目撃も裏付けになる。
- 運用番号は運用 id でなく番号（`operation_number`）で比べる。同じ番号でもダイヤごとに id が違うが、同じ運行日なら同じダイヤなので番号で足りる。
- 運用 100（休車）への投稿も同じ規則で判定する。特別扱いしない。
- 運用番号の付け替え（同日引き継ぎ・運用の変更）があると、正しい投稿でも `conflicting` になりうる。`conflicting` は間違いを意味しない。client は「食い違い＝間違い」と言い切らない文言で受ける（client の spec）。

### 規則は read model・SQL は事実だけ

- 判定の規則は `SightingCorroboration`（`src/libs/operation-sighting/usecase/read-models/sighting-corroboration.read-model.ts`）に 1 か所だけ置く。`of(facts)` が 1 件の値を返し、`count(values)` が 4 つのキーをいつも持つ件数を返す。`SightingAuthorMarks`（ADR-0013）と同じ流儀。
- SQL は `OperationSightingAuthorQuery.findCorroborationFacts`（`src/libs/operation-sighting/infrastructure/queries/operation-sighting-author.query.ts`）。本人の投稿ごとに、運用番号・本人の投稿が今無効か・他の目撃の運用番号の集合（`array_agg(DISTINCT …)`・無ければ `[]`）だけを返す。値の判定は SQL に書かない。
  - 他の目撃は、同じ編成・同じ運行日・自分自身でない・author 行が本人でない（`NOT EXISTS`）・無効化の行が無い（`NOT EXISTS`）もの。anti-join は `NOT EXISTS`（CLAUDE.md の流儀）。
- 一覧は `OperationSightingV3Service.findManyMine`。`findManyByUserId` と同じ limit・before で本人のページ（最大 200 件）を取り、その id をまとめて 1 本の SQL に渡す。N+1 にしない。材料が見つからない行があれば `UnexpectedError`。
- 要約の内訳は `OperationSightingV3Service.countCorroborationsByUserId`。内訳は全件が要るので、本人の全投稿（無効を含む）に同じ SQL を当て、read model で数える。一覧と要約の内訳は同じ SQL・同じ規則を使う。投稿数・無効数は `UserQuery.findUserSummary` の別の問い合わせなので、同時に投稿があると 1 ずれることがある（表示だけなので許す）。

### 作らないもの

- 他の人との比較・順位・正答率の数字。投稿の数を競わせると、雑な投稿が増える。
- 裏付けの通知。
- ゲストの投稿・記録を始める前の投稿を、さかのぼって本人に紐づけること（author 行が無い）。client で「記録は 2026年10月24日から」と書く。
- 「今日まだ目撃の無い運用」の口。目撃募集は client が今ある取得から導く。

## 却下した案

- 判定を SQL の CASE で書く。規則が SQL に埋まり、単体テストが DB 頼みになる。
- 一覧の 1 件ごとに判定の SQL を投げる。最大 200 件で N+1 になる。
- `/users/:userId` に本人の id を渡す形にする。他人の id を入れて読む道ができる。
- 裏付けの数・順位・正答率を出して競わせる。雑な投稿が増える。

## 結果

- migration は無い。表は増えない。
- 確かめ方（単体テスト）:
  - 判定の規則（4 値・本人の別投稿しか無い場合・ゲストの目撃で裏付く場合）: `sighting-corroboration.read-model.spec.ts`。
  - SQL（日の境目・他人の無効な目撃を除く・本人の目撃を除く）: `operation-sighting-author.query.spec.ts`。
  - サービス: `operation-sighting.v3.service.spec.ts`（`findManyMine`・`countCorroborationsByUserId`）。
  - controller（REPORTER が読める・ゲストは 403・別人の userId を渡す道が無い）: `user.v3.controller.spec.ts`。
- 本番 DB での実測（2026-11-03）。
  - 口の値と、別の書き方の SQL（`bool_or`）で数えた値が、投稿者 5 人とも一致した。
  - 一番多い投稿者は 720 件のうち、裏付けあり 18・別の運用の目撃あり（食い違い）85・他の目撃なし 601・無効 16。投稿者がほぼ 1 人なので、今は「他の目撃なし」が大半になる。人が増えるまで、裏付けの数は小さい。
  - 4 時の境目は、03:59:59 JST が前日、04:00:00 JST が当日の運行日になる（`sighting_time` は timestamptz）。
- 性能: 判定の SQL は `sighting_time` を式で包むので、`(formation_id, sighting_time)` の範囲が使えず、その編成の全履歴をなめる。今の件数では問題ない。増えたら、粗い範囲条件（運行日の前後 1 日など）を足して索引を使えるようにする。
- 要約は全件に同じ SQL を当てる。1 人 1 万件を超えるようになったら考え直す（今は作らない）。
- 出す順は、api のデプロイ → client の画面。api だけが先に出ても、口が増えるだけで害は無い。
- 手元の docker の api は別の checkout をマウントしているので、この作業では作り直していない。手元の確かめは、本番 DB を読む形で controller が行った。
