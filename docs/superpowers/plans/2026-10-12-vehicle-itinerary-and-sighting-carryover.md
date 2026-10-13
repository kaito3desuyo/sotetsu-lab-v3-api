# 車両の行程表と目撃の引き継ぎ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 区間（`trip_operation_lists`）に「次の区間」を持たせ、3 つの決まりで車両の行程表を組み、行程表のどこで目撃された編成も同じ行程表のすべての運用で目撃扱いにする（11K で見た編成は 12K でも。逆も）。

**Architecture:** API は、区間の一覧から行程表を組む純粋な関数を `calendar/domain/` に 1 つだけ置く（臨時ダイヤの計画で、ダイヤ集約がこれを取り込む）。時刻断面（real-time・駅別時刻表・列車位置情報などが使う）と期間の目撃一覧は、この関数で引き継ぎを解く。client は、返ってきた `sightedAsOperation` で「（11Kとして目撃）」を出し、運用表・行路図に前後の運用を出し、編集画面で「次の区間」を選べるようにする。

**Tech Stack:** API: NestJS 10・TypeORM 0.3（PostgreSQL / Supabase）・Jest。client: Angular 22・Akita ストア・Material（M2）・Tailwind（`tw-` 接頭辞）・Jest。

**Spec:** `sotetsu-lab-v3-api/docs/superpowers/specs/2026-10-12-special-trips-design.md`（3.1 のうち `next_trip_operation_list_id`、3.6、4.6、5.3、7 章の行程表・目撃の項）

## Global Constraints

- 足す列は `trip_operation_lists.next_trip_operation_list_id`（uuid・任意・`trip_operation_lists.id` を参照・一意）の 1 つだけ。ほかの表の形は変えない（`parent_calendar_id`・組の表・`extra_calendar_id` の削除は臨時ダイヤの計画で行う）
- 「次の区間」は同じカレンダーの運用の区間に限る・一意・自分自身を指さない・たどって輪にならない
- 決まりは 1 → 2 → 3 の順に当てる。決まり 1 は「その列車のまとまり（trip_block）のその駅・その時刻で、終わる区間も始まる区間も 1 つずつ」のときだけ当てる
- 行程表の組み立ては `src/libs/calendar/domain/vehicle-itinerary.ts` の 1 か所だけ。ほかで同じ判定を書かない
- 引き継いだ目撃には、目撃されたときの運用（`sightedAsOperation`: `operationId`・`operationNumber`）を付ける。直接の目撃には付けない（`null`）
- API の query は `createQueryBuilder` だけで書く（`find`・`findOne`・`getMany` 系の CRUD ヘルパーを新たに使わない）。anti-join は `NOT EXISTS`
- 時刻は「その鉄道日の 0 時からの秒数」でそろえる。`times.*_days` は 1 が当日（`(days - 1) * 86400 + 時刻の秒`）。目撃時刻は `t.diff(getBaseDate(t), 'second')`
- client の UI は Material 部品と Tailwind（`tw-` 接頭辞・枠は `tw-border-solid` 併記・`[ngClass]` でなく `[class]`）。情報を削らない
- コミットは Conventional Commits＋絵文字（例 `feat: :sparkles: …`）・ドメイン名は日本語。署名コミットはサンドボックス外で行い、`git log --show-signature -1` で確かめる。push はユーザーに `! git push` を頼む
- Bash でパイプをつながない（1 コマンド 1 目的）。client の jest は `npx jest --testPathPattern <path>`
- 本番 DB への書き込み（マイグレーション・データ入力）はユーザーが行う。Supabase MCP は読み取り専用

## Review Focus

- **既存の列車を編集して保存しても、つながりが消えないこと。** 今の編集画面は保存のたびに区間を 1 つに作り直し、区間の id を送らない。直さないと、海老名のつながりを入れた列車を時刻の修正で保存しただけで、つながりも、その区間を指していた矢印も消える（Task 10 で id と `nextTripOperationListId` を送り返す。API は Task 2 で「送られなかった値は変えない」をテストで固める）
- **区間を 2 つ持つ列車（本番に 3 本）を編集で 1 つに潰さないこと。** 今の編集画面は運番を 1 つしか持てない。区間が 2 つ以上の列車は、区間をそのまま送り返し、運番の欄は触れないようにする（Task 10）
- **朝の 02K の目撃が、夜の 02K（別の車両）に出ないこと。** 運番だけで目撃を引くと、交換後の 02K に朝の編成が出る。目撃は「その時刻にその運番を受け持っていた区間」に結び付けて判定する（Task 3・Task 7）
- **引き継いだ先で、もっと新しい直接の目撃があれば、そちらが勝つこと（追い出し）。** 11K で 10701 を見たあと、12K で 10702 を見たら、12K にも 11K にも 10702 を出す。編成の側から見ても、10701 は「追い出された」になる（Task 7）
- **行程表の組み立てが real-time を重くしないこと。** 1 回の問い合わせで、区間の一覧（約 1,500 行）と今日の目撃を 1 回ずつ引く。まとめて返す口では 1 回だけ組み立てる（Task 7 のテストで問い合わせの回数を数える）

---

## 作業の前に

- API は `sotetsu-lab-v3-api` の `feature/special-trips`（spec と同じブランチ）で行う
- client は `sotetsu-lab-v3-client` の master から `feature/vehicle-itinerary` を生やし、`first commit` の空コミットを置く。今の client は `feature/ssr` にいて、master も pull できていない（SSH 失敗）。ユーザーに `! git pull` を頼んでから切る
- デプロイの順: API が先（足す値はすべて任意なので、古い client はそのまま動く）→ マイグレーション（ユーザー）→ client

---

## API（sotetsu-lab-v3-api）

### Task 1: 「次の区間」の列を足す

**Files:**
- Create: `db/migrations/1792000000000-AddNextTripOperationListId.ts`
- Modify: `src/libs/trip/infrastructure/models/trip-operation-list.model.ts`

**Interfaces:**
- Produces: `TripOperationListModel.nextTripOperationListId: string | null`（列 `next_trip_operation_list_id`）

- [ ] **Step 1: マイグレーションを書く**

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextTripOperationListId1792000000000 implements MigrationInterface {
    name = 'AddNextTripOperationListId1792000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD "next_trip_operation_list_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_trip_operation_lists_next_trip_operation_list_id" ON "trip_operation_lists" ("next_trip_operation_list_id")`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "FK_trip_operation_lists_next_trip_operation_list_id" FOREIGN KEY ("next_trip_operation_list_id") REFERENCES "trip_operation_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" ADD CONSTRAINT "CHK_trip_operation_lists_next_not_self" CHECK ("next_trip_operation_list_id" IS NULL OR "next_trip_operation_list_id" <> "id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "CHK_trip_operation_lists_next_not_self"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP CONSTRAINT "FK_trip_operation_lists_next_trip_operation_list_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_trip_operation_lists_next_trip_operation_list_id"`);
        await queryRunner.query(`ALTER TABLE "trip_operation_lists" DROP COLUMN "next_trip_operation_list_id"`);
    }
}
```

`ON DELETE SET NULL` にするのは、指されていた区間が列車の削除で消えたとき、指していた側を壊さずに「つながりなし」へ戻すため。PostgreSQL の一意索引は NULL を重複と見なさない。

- [ ] **Step 2: モデルに列を足す**（`endTimeId` の下）

```ts
    /** この区間のあと、車両が移る区間（spec 3.6 決まり 2）。同じカレンダーの運用の区間に限る */
    @Column('uuid', { nullable: true })
    @Index({ unique: true })
    nextTripOperationListId: string | null;
```

- [ ] **Step 3: 型とビルドを確かめる**

Run: `npm run build`
Expected: エラーなく `dist/` ができる

- [ ] **Step 4: コミット**

```bash
git add db/migrations/1792000000000-AddNextTripOperationListId.ts src/libs/trip/infrastructure/models/trip-operation-list.model.ts
git commit -m "feat: :sparkles: 列車の運用区間に次の区間の列を足す"
```

---

### Task 2: 「次の区間」を読み書きの道に通す

**Files:**
- Modify: `src/libs/trip/domain/trip-operation-list.domain.ts`
- Modify: `src/libs/trip/usecase/dtos/validatable-trip-operation-list.dto.ts`
- Modify: `src/libs/trip/usecase/dtos/create-trip-operation-list.dto.ts`
- Modify: `src/libs/trip/usecase/dtos/replace-trip-operation-list.dto.ts`
- Modify: `src/libs/trip/usecase/dtos/trip-operation-list-details.dto.ts`
- Modify: `src/libs/trip/usecase/builders/trip-operation-list.domain.builder.ts`
- Modify: `src/libs/trip/infrastructure/builders/trip-operation-list.model.builder.ts`
- Modify: `src/libs/trip-block/infrastructure/queries/trip-block.query.ts`（区間の列を選ぶところすべて）
- Modify: `src/libs/trip-block/usecase/trip-block-fieldsets.ts`（`tripOperationLists` の項目の許可リスト）
- Test: `src/libs/trip/infrastructure/builders/trip-operation-list.model.builder.spec.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の列
- Produces: `ITripOperationListProps.nextTripOperationListId?: string | null`・各 DTO の `nextTripOperationListId?: string | null`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { TripOperationList } from '../../domain/trip-operation-list.domain';
import { TripOperationListModelBuilder } from './trip-operation-list.model.builder';

const base = {
    tripId: 't1',
    operationId: 'o1',
    startStationId: 's1',
    endStationId: 's2',
    startTimeId: 'tm1',
    endTimeId: 'tm2',
};

describe('TripOperationListModelBuilder', () => {
    it('次の区間を渡す', () => {
        const domain = TripOperationList.create(
            { ...base, nextTripOperationListId: 'next' },
            new UniqueEntityId('a'),
        );
        expect(TripOperationListModelBuilder.buildFromDomain(domain).nextTripOperationListId).toBe('next');
    });

    it('null は「つながりを消す」として渡す', () => {
        const domain = TripOperationList.create(
            { ...base, nextTripOperationListId: null },
            new UniqueEntityId('a'),
        );
        expect(TripOperationListModelBuilder.buildFromDomain(domain).nextTripOperationListId).toBeNull();
    });

    it('送られなかったときは列を書かない（undefined のまま。save が今の値を残す）', () => {
        const domain = TripOperationList.create(base, new UniqueEntityId('a'));
        const model = TripOperationListModelBuilder.buildFromDomain(domain);
        expect('nextTripOperationListId' in model).toBe(false);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- trip-operation-list.model.builder`
Expected: FAIL（`nextTripOperationListId` が型にない）

- [ ] **Step 3: 型と組み立てに足す**

`trip-operation-list.domain.ts` の props:

```ts
interface ITripOperationListProps {
    tripId: string;
    operationId: string;
    startStationId: string;
    endStationId: string;
    startTimeId: string;
    endTimeId: string;
    /** undefined は「送られていない（今の値を残す）」、null は「つながりなし」 */
    nextTripOperationListId?: string | null;
}
```

`trip-operation-list.model.builder.ts` の `buildFromDomain`:

```ts
    buildFromDomain: (domain: TripOperationList): TripOperationListModel => {
        const model: TripOperationListModel = {
            id: domain.id.value,
            tripId: domain.props.tripId,
            operationId: domain.props.operationId,
            startStationId: domain.props.startStationId,
            endStationId: domain.props.endStationId,
            startTimeId: domain.props.startTimeId,
            endTimeId: domain.props.endTimeId,
        } as TripOperationListModel;
        // undefined のときはキーごと置かない。TypeORM の save は無いキーの列を更新しない
        if (domain.props.nextTripOperationListId !== undefined) {
            model.nextTripOperationListId = domain.props.nextTripOperationListId;
        }
        return model;
    },
```

`validatable-trip-operation-list.dto.ts` に足す（`IsOptional` と `IsUUID` を import）:

```ts
    @IsOptional()
    @IsUUID()
    nextTripOperationListId?: string | null;
```

`create-trip-operation-list.dto.ts`・`replace-trip-operation-list.dto.ts` に足す:

```ts
    nextTripOperationListId?: string | null;
```

`trip-operation-list-details.dto.ts` に足す:

```ts
    @Expose()
    nextTripOperationListId: string | null;
```

`trip-operation-list.domain.builder.ts` の 3 つの組み立て（`buildFromDetailsDto`・`buildFromCreateDto`・`buildFromReplaceDto`）の props に、それぞれ `nextTripOperationListId: dto.nextTripOperationListId,` を足す。

- [ ] **Step 4: 取得で列を返す**

`trip-block.query.ts` で区間を `addSelect` / `select` している箇所（`grep -n "tripOperationLists\." src/libs/trip-block/infrastructure/queries/trip-block.query.ts` で探す）に `tripOperationLists.nextTripOperationListId` を足す。`trip-block-fieldsets.ts` の区間の項目の許可リストにも `nextTripOperationListId` を足す。`leftJoinAndSelect('trip.tripOperationLists', …)` で全列を選んでいる箇所は変更不要。

- [ ] **Step 5: テストを通す**

Run: `npm run test -- trip-operation-list.model.builder`
Expected: PASS

Run: `npm run test -- trip-block`
Expected: PASS（既存の trip-block の spec が壊れていない）

- [ ] **Step 6: コミット**

```bash
git add src/libs/trip src/libs/trip-block
git commit -m "feat: :sparkles: 列車の運用区間の次の区間を読み書きできるようにする"
```

---

### Task 3: 車両の行程表を組む（純粋な関数）

**Files:**
- Create: `src/libs/calendar/domain/vehicle-itinerary.ts`
- Test: `src/libs/calendar/domain/vehicle-itinerary.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface ItinerarySegment {
    id: string;
    tripId: string;
    tripBlockId: string;
    operationId: string;
    operationNumber: string;
    startStationId: string;
    endStationId: string;
    /** 鉄道日の 0 時からの秒。出発時刻 */
    startSeconds: number;
    /** 鉄道日の 0 時からの秒。到着時刻 */
    endSeconds: number;
    nextTripOperationListId: string | null;
}
export type ItineraryRule = 1 | 2 | 3;
export interface ItineraryLink { segment: ItinerarySegment; rule: ItineraryRule }
export interface VehicleItineraries {
    /** 行程表の一覧。各行程表は時刻順の区間 */
    readonly itineraries: ItinerarySegment[][];
    itineraryIndexOf(segmentId: string): number | undefined;
    nextOf(segmentId: string): ItineraryLink | null;
    previousOf(segmentId: string): ItineraryLink | null;
    /** その時刻にその運番を受け持っている区間（受け持ち中 → 直前に終わった区間 → 最初の区間） */
    segmentOfOperationAt(operationNumber: string, seconds: number): ItinerarySegment | null;
    /** その時刻にその行程表で車両がいる区間（同じ選び方） */
    segmentOfItineraryAt(itineraryIndex: number, seconds: number): ItinerarySegment | null;
}
export function buildVehicleItineraries(segments: ItinerarySegment[]): VehicleItineraries;
export function secondsOfServiceDay(days: number | null, time: string | null): number | null;
```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import {
    buildVehicleItineraries,
    ItinerarySegment,
    secondsOfServiceDay,
} from './vehicle-itinerary';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};

const seg = (p: Partial<ItinerarySegment> & Pick<ItinerarySegment, 'id' | 'operationNumber'>): ItinerarySegment => ({
    tripId: p.id,
    tripBlockId: `block-${p.id}`,
    operationId: `op-${p.operationNumber}`,
    startStationId: 'X',
    endStationId: 'Y',
    startSeconds: 0,
    endSeconds: 0,
    nextTripOperationListId: null,
    ...p,
});

describe('secondsOfServiceDay', () => {
    it('1 日目はそのまま、2 日目は 24 時間足す', () => {
        expect(secondsOfServiceDay(1, '08:22:00')).toBe(t('08:22'));
        expect(secondsOfServiceDay(2, '00:30:00')).toBe(86400 + t('00:30'));
    });
    it('時刻が無ければ null', () => {
        expect(secondsOfServiceDay(null, null)).toBeNull();
    });
});

describe('buildVehicleItineraries', () => {
    it('決まり 3: 同じ運番の次の区間へ移る（ふつうの折り返し）', () => {
        const a = seg({ id: 'a', operationNumber: '11K', startSeconds: t('06:00'), endSeconds: t('07:00') });
        const b = seg({ id: 'b', operationNumber: '11K', startSeconds: t('07:10'), endSeconds: t('08:22') });
        const it = buildVehicleItineraries([b, a]);
        expect(it.itineraries.map((i) => i.map((s) => s.id))).toEqual([['a', 'b']]);
        expect(it.nextOf('a')).toEqual({ segment: b, rule: 3 });
    });

    it('決まり 2: 海老名 11K → 12K（別の列車・別のまとまり）', () => {
        const k11 = seg({ id: '6557', operationNumber: '11K', endStationId: 'ebina', startSeconds: t('07:30'), endSeconds: t('08:22'), nextTripOperationListId: '3808' });
        const k12 = seg({ id: '3808', operationNumber: '12K', startStationId: 'ebina', startSeconds: t('08:30'), endSeconds: t('09:30') });
        const k12later = seg({ id: '3810', operationNumber: '12K', startSeconds: t('10:00'), endSeconds: t('11:00') });
        const it = buildVehicleItineraries([k11, k12, k12later]);
        expect(it.itineraries.map((i) => i.map((s) => s.id))).toEqual([['6557', '3808', '3810']]);
        expect(it.nextOf('6557')?.rule).toBe(2);
        expect(it.previousOf('3808')).toEqual({ segment: k11, rule: 2 });
    });

    it('決まり 1: 赤羽岩淵で 02K と 18K が札を交換する', () => {
        // A1718K: 西谷〜赤羽岩淵 18K、赤羽岩淵〜浦和美園 02K
        const a18 = seg({ id: 'A18', tripId: 'A1718K', tripBlockId: 'bA', operationNumber: '18K', endStationId: 'akabane', startSeconds: t('17:00'), endSeconds: t('18:32') });
        const a02 = seg({ id: 'A02', tripId: 'A1718K', tripBlockId: 'bA', operationNumber: '02K', startStationId: 'akabane', startSeconds: t('18:32'), endSeconds: t('18:50') });
        // B1818K: 浦和美園〜赤羽岩淵 02K、赤羽岩淵〜湘南台 18K
        const b02 = seg({ id: 'B02', tripId: 'B1818K', tripBlockId: 'bB', operationNumber: '02K', endStationId: 'akabane', startSeconds: t('18:10'), endSeconds: t('18:32') });
        const b18 = seg({ id: 'B18', tripId: 'B1818K', tripBlockId: 'bB', operationNumber: '18K', startStationId: 'akabane', startSeconds: t('18:32'), endSeconds: t('19:40') });
        // 朝の 02K（車両 P）
        const p02 = seg({ id: 'P02', operationNumber: '02K', startSeconds: t('06:00'), endSeconds: t('07:00') });
        const it = buildVehicleItineraries([a18, a02, b02, b18, p02]);

        expect(it.nextOf('B02')).toEqual({ segment: b18, rule: 1 });
        expect(it.nextOf('A18')).toEqual({ segment: a02, rule: 1 });
        // 朝の 02K（P）の行程表は 18:32 以降 18K にいる
        const p = it.itineraryIndexOf('P02')!;
        expect(it.itineraryIndexOf('B18')).toBe(p);
        expect(it.itineraryIndexOf('A02')).not.toBe(p);
        // 19:00 の 02K を受け持つのは A02（車両 Q）
        expect(it.segmentOfOperationAt('02K', t('18:40'))?.id).toBe('A02');
        expect(it.segmentOfItineraryAt(p, t('19:00'))?.id).toBe('B18');
    });

    it('決まり 1 は答えが 1 つに決まらないとき当てない（併結・分割）', () => {
        const end1 = seg({ id: 'e1', tripBlockId: 'b', operationNumber: '01K', endStationId: 'S', endSeconds: t('10:00') });
        const end2 = seg({ id: 'e2', tripBlockId: 'b', operationNumber: '03K', endStationId: 'S', endSeconds: t('10:00') });
        const start1 = seg({ id: 's1', tripBlockId: 'b', operationNumber: '05K', startStationId: 'S', startSeconds: t('10:00'), endSeconds: t('11:00') });
        const it = buildVehicleItineraries([end1, end2, start1]);
        expect(it.nextOf('e1')).toBeNull();
        expect(it.nextOf('e2')).toBeNull();
    });

    it('決まり 2: 02K → 90M → 02K（車両が出かけて帰ってくる）', () => {
        const a = seg({ id: 'A902K', operationNumber: '02K', startSeconds: t('10:30'), endSeconds: t('11:22'), nextTripOperationListId: 'M1' });
        const m1 = seg({ id: 'M1', operationNumber: '90M', startSeconds: t('11:30'), endSeconds: t('12:30') });
        const m2 = seg({ id: 'M2', operationNumber: '90M', startSeconds: t('13:00'), endSeconds: t('18:40'), nextTripOperationListId: 'B1802K' });
        const other02 = seg({ id: 'X02', operationNumber: '02K', startSeconds: t('12:00'), endSeconds: t('13:00') });
        const b = seg({ id: 'B1802K', operationNumber: '02K', startSeconds: t('18:57'), endSeconds: t('19:30') });
        const it = buildVehicleItineraries([a, m1, m2, other02, b]);
        expect(it.itineraries.find((i) => i[0].id === 'A902K')!.map((s) => s.id)).toEqual(['A902K', 'M1', 'M2', 'B1802K']);
        // 02K の 12:00 の区間は別の車両
        expect(it.itineraryIndexOf('X02')).not.toBe(it.itineraryIndexOf('A902K'));
    });

    it('決まり 3 の行き先がすでに別の区間から来ているなら、つながない', () => {
        const a = seg({ id: 'a', operationNumber: '12K', startSeconds: t('06:00'), endSeconds: t('07:00') });
        const from11 = seg({ id: 'f', operationNumber: '11K', endSeconds: t('08:22'), nextTripOperationListId: 'b' });
        const b = seg({ id: 'b', operationNumber: '12K', startSeconds: t('08:30'), endSeconds: t('09:00') });
        const it = buildVehicleItineraries([a, from11, b]);
        expect(it.previousOf('b')?.segment.id).toBe('f');
        expect(it.nextOf('a')).toBeNull();
    });

    it('次の区間が輪になっていても止まる', () => {
        const a = seg({ id: 'a', operationNumber: '1', startSeconds: 1, endSeconds: 2, nextTripOperationListId: 'b' });
        const b = seg({ id: 'b', operationNumber: '2', startSeconds: 3, endSeconds: 4, nextTripOperationListId: 'a' });
        const it = buildVehicleItineraries([a, b]);
        expect(it.itineraries.flat().map((s) => s.id).sort()).toEqual(['a', 'b']);
    });

    it('受け持ちの時刻: 受け持ち中 → 直前に終わった区間 → 最初の区間', () => {
        const a = seg({ id: 'a', operationNumber: '11K', startSeconds: t('06:00'), endSeconds: t('07:00') });
        const b = seg({ id: 'b', operationNumber: '11K', startSeconds: t('08:00'), endSeconds: t('09:00') });
        const it = buildVehicleItineraries([a, b]);
        expect(it.segmentOfOperationAt('11K', t('06:30'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('07:30'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('05:00'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('23:00'))?.id).toBe('b');
        expect(it.segmentOfOperationAt('99X', t('06:30'))).toBeNull();
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- vehicle-itinerary`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

```ts
/**
 * 車両の行程表（spec 3.6）。区間（trip_operation_lists）の一覧から、車両 1 台ぶんの 1 日を組み立てる。
 * 決まりは 1 → 2 → 3 の順。行程表の組み立てはここ 1 か所だけで行う。
 *
 * 決まり 1: 列車のまとまり（trip_block）の途中で運番が変わったら、車両はその列車に乗ったまま次の運番へ移る。
 *           その駅・その時刻で、終わる区間も始まる区間も 1 つずつのときだけ当てる（併結・分割では当てない）。
 * 決まり 2: 「次の区間」（next_trip_operation_list_id）が入っていれば、そこへ移る。
 * 決まり 3: どちらでもなければ、同じ運番の次の区間へ移る。行き先がすでに別の区間から来ているならつながない。
 */

export interface ItinerarySegment {
    id: string;
    tripId: string;
    tripBlockId: string;
    operationId: string;
    operationNumber: string;
    startStationId: string;
    endStationId: string;
    /** 鉄道日の 0 時からの秒。出発時刻 */
    startSeconds: number;
    /** 鉄道日の 0 時からの秒。到着時刻 */
    endSeconds: number;
    nextTripOperationListId: string | null;
}

export type ItineraryRule = 1 | 2 | 3;

export interface ItineraryLink {
    segment: ItinerarySegment;
    rule: ItineraryRule;
}

export interface VehicleItineraries {
    readonly itineraries: ItinerarySegment[][];
    itineraryIndexOf(segmentId: string): number | undefined;
    nextOf(segmentId: string): ItineraryLink | null;
    previousOf(segmentId: string): ItineraryLink | null;
    segmentOfOperationAt(operationNumber: string, seconds: number): ItinerarySegment | null;
    segmentOfItineraryAt(itineraryIndex: number, seconds: number): ItinerarySegment | null;
}

/** times の (days, 'HH:mm:ss') を鉄道日の 0 時からの秒にする。days は 1 が当日 */
export function secondsOfServiceDay(days: number | null, time: string | null): number | null {
    if (!time) return null;
    const [h, m, s = 0] = time.split(':').map(Number);
    return ((days ?? 1) - 1) * 86400 + h * 3600 + m * 60 + s;
}

const byTime = (a: ItinerarySegment, b: ItinerarySegment) =>
    a.startSeconds - b.startSeconds || a.endSeconds - b.endSeconds || a.id.localeCompare(b.id);

/** 受け持ち中 → 直前に終わった区間 → 最初の区間（時刻順の配列から選ぶ） */
function pickAt(sorted: ItinerarySegment[], seconds: number): ItinerarySegment | null {
    if (!sorted.length) return null;
    const active = sorted.find((s) => s.startSeconds <= seconds && seconds <= s.endSeconds);
    if (active) return active;
    const ended = sorted.filter((s) => s.endSeconds <= seconds);
    return ended.length ? ended[ended.length - 1] : sorted[0];
}

export function buildVehicleItineraries(segments: ItinerarySegment[]): VehicleItineraries {
    const sorted = [...segments].sort(byTime);
    const byId = new Map(sorted.map((s) => [s.id, s]));
    const next = new Map<string, ItineraryLink>();
    const previous = new Map<string, ItineraryLink>();

    const link = (from: ItinerarySegment, to: ItinerarySegment, rule: ItineraryRule): boolean => {
        if (from.id === to.id || next.has(from.id) || previous.has(to.id)) return false;
        next.set(from.id, { segment: to, rule });
        previous.set(to.id, { segment: from, rule });
        return true;
    };

    // 決まり 1
    const byBlock = new Map<string, ItinerarySegment[]>();
    for (const s of sorted) {
        byBlock.set(s.tripBlockId, [...(byBlock.get(s.tripBlockId) ?? []), s]);
    }
    for (const s of sorted) {
        const block = byBlock.get(s.tripBlockId) ?? [];
        const ending = block.filter((o) => o.endStationId === s.endStationId && o.endSeconds === s.endSeconds);
        const later = block.filter(
            (o) => o.id !== s.id && o.startStationId === s.endStationId && o.startSeconds >= s.endSeconds,
        );
        if (!later.length) continue;
        const first = Math.min(...later.map((o) => o.startSeconds));
        const starting = later.filter((o) => o.startSeconds === first);
        if (ending.length === 1 && starting.length === 1) link(s, starting[0], 1);
    }

    // 決まり 2
    for (const s of sorted) {
        if (next.has(s.id) || !s.nextTripOperationListId) continue;
        const to = byId.get(s.nextTripOperationListId);
        if (to) link(s, to, 2);
    }

    // 決まり 3
    const byOperation = new Map<string, ItinerarySegment[]>();
    for (const s of sorted) {
        byOperation.set(s.operationNumber, [...(byOperation.get(s.operationNumber) ?? []), s]);
    }
    for (const list of byOperation.values()) {
        for (let i = 0; i < list.length - 1; i++) {
            if (!next.has(list[i].id)) link(list[i], list[i + 1], 3);
        }
    }

    // 頭（前の無い区間）からたどる。輪になって頭の無いものは、いちばん早い区間で切る
    const itineraries: ItinerarySegment[][] = [];
    const indexOf = new Map<string, number>();
    const walk = (head: ItinerarySegment) => {
        const chain: ItinerarySegment[] = [];
        let cur: ItinerarySegment | undefined = head;
        while (cur && !indexOf.has(cur.id)) {
            indexOf.set(cur.id, itineraries.length);
            chain.push(cur);
            cur = next.get(cur.id)?.segment;
        }
        itineraries.push(chain);
    };
    for (const s of sorted) if (!previous.has(s.id) && !indexOf.has(s.id)) walk(s);
    for (const s of sorted) if (!indexOf.has(s.id)) walk(s);

    return {
        itineraries,
        itineraryIndexOf: (id) => indexOf.get(id),
        nextOf: (id) => next.get(id) ?? null,
        previousOf: (id) => previous.get(id) ?? null,
        segmentOfOperationAt: (operationNumber, seconds) => pickAt(byOperation.get(operationNumber) ?? [], seconds),
        segmentOfItineraryAt: (index, seconds) => pickAt([...(itineraries[index] ?? [])].sort(byTime), seconds),
    };
}
```

- [ ] **Step 4: テストを通す**

Run: `npm run test -- vehicle-itinerary`
Expected: PASS（10 件）

- [ ] **Step 5: コミット**

```bash
git add src/libs/calendar/domain
git commit -m "feat: :sparkles: 区間のつながりから車両の行程表を組み立てる"
```

---

### Task 4: カレンダーの区間を行程表の形で引く

**Files:**
- Create: `src/libs/calendar/infrastructure/queries/itinerary-segment.query.ts`
- Test: `src/libs/calendar/infrastructure/queries/itinerary-segment.query.spec.ts`
- Modify: `src/libs/calendar/calendar.libs.module.ts`（`TripOperationListModel` を forFeature に足し、`ItinerarySegmentQuery` を provide / export）

**Interfaces:**
- Consumes: Task 3 の `ItinerarySegment`・`secondsOfServiceDay`・`buildVehicleItineraries`
- Produces: `ItinerarySegmentQuery.findManyByCalendarId({ calendarId }): Promise<ItinerarySegment[]>`・`ItinerarySegmentQuery.buildByCalendarId({ calendarId }): Promise<VehicleItineraries>`

- [ ] **Step 1: 失敗するテストを書く**（生の行から区間への変換と、時刻が欠けた行を落とすこと）

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { ItinerarySegmentQuery } from './itinerary-segment.query';

const getRawMany = jest.fn();
const qb: Record<string, jest.Mock> = {};
for (const m of ['select', 'addSelect', 'innerJoin', 'where']) qb[m] = jest.fn(() => qb);
qb.getRawMany = getRawMany;

describe('ItinerarySegmentQuery', () => {
    let query: ItinerarySegmentQuery;
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ItinerarySegmentQuery,
                { provide: getRepositoryToken(TripOperationListModel), useValue: { createQueryBuilder: () => qb } },
            ],
        }).compile();
        query = module.get(ItinerarySegmentQuery);
    });

    it('行を区間にし、時刻は鉄道日の 0 時からの秒にする', async () => {
        getRawMany.mockResolvedValue([
            {
                id: 'a', tripId: 't', tripBlockId: 'b', operationId: 'o', operationNumber: '11K',
                startStationId: 's1', endStationId: 's2',
                departureDays: 1, departureTime: '08:00:00', arrivalDays: 2, arrivalTime: '00:10:00',
                nextTripOperationListId: null,
            },
        ]);
        expect(await query.findManyByCalendarId({ calendarId: 'c' })).toEqual([
            {
                id: 'a', tripId: 't', tripBlockId: 'b', operationId: 'o', operationNumber: '11K',
                startStationId: 's1', endStationId: 's2',
                startSeconds: 8 * 3600, endSeconds: 86400 + 600,
                nextTripOperationListId: null,
            },
        ]);
    });

    it('発着の時刻が無い区間は落とす（つながりを判定できないため）', async () => {
        getRawMany.mockResolvedValue([
            { id: 'a', tripId: 't', tripBlockId: 'b', operationId: 'o', operationNumber: '1', startStationId: 's', endStationId: 's', departureDays: null, departureTime: null, arrivalDays: 1, arrivalTime: '08:00:00', nextTripOperationListId: null },
        ]);
        expect(await query.findManyByCalendarId({ calendarId: 'c' })).toEqual([]);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- itinerary-segment.query`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { Repository } from 'typeorm';
import {
    buildVehicleItineraries,
    ItinerarySegment,
    secondsOfServiceDay,
    VehicleItineraries,
} from '../../domain/vehicle-itinerary';

/** 行程表の材料（カレンダーの運用の区間すべて）を 1 回の問い合わせで引く */
@Injectable()
export class ItinerarySegmentQuery {
    constructor(
        @InjectRepository(TripOperationListModel)
        private readonly tripOperationListRepository: Repository<TripOperationListModel>,
    ) {}

    async findManyByCalendarId(params: { calendarId: string }): Promise<ItinerarySegment[]> {
        const rows = await this.tripOperationListRepository
            .createQueryBuilder('tol')
            .select('tol.id', 'id')
            .addSelect('tol.tripId', 'tripId')
            .addSelect('trip.tripBlockId', 'tripBlockId')
            .addSelect('tol.operationId', 'operationId')
            .addSelect('operation.operationNumber', 'operationNumber')
            .addSelect('tol.startStationId', 'startStationId')
            .addSelect('tol.endStationId', 'endStationId')
            .addSelect('startTime.departureDays', 'departureDays')
            .addSelect('startTime.departureTime', 'departureTime')
            .addSelect('endTime.arrivalDays', 'arrivalDays')
            .addSelect('endTime.arrivalTime', 'arrivalTime')
            .addSelect('tol.nextTripOperationListId', 'nextTripOperationListId')
            .innerJoin('tol.trip', 'trip')
            .innerJoin('tol.operation', 'operation')
            .innerJoin('tol.startTime', 'startTime')
            .innerJoin('tol.endTime', 'endTime')
            .where('operation.calendarId = :calendarId', { calendarId: params.calendarId })
            .getRawMany();

        return rows.flatMap((r) => {
            const startSeconds = secondsOfServiceDay(r.departureDays, r.departureTime);
            const endSeconds = secondsOfServiceDay(r.arrivalDays, r.arrivalTime);
            if (startSeconds === null || endSeconds === null) return [];
            return [{
                id: r.id,
                tripId: r.tripId,
                tripBlockId: r.tripBlockId,
                operationId: r.operationId,
                operationNumber: r.operationNumber,
                startStationId: r.startStationId,
                endStationId: r.endStationId,
                startSeconds,
                endSeconds,
                nextTripOperationListId: r.nextTripOperationListId ?? null,
            }];
        });
    }

    async buildByCalendarId(params: { calendarId: string }): Promise<VehicleItineraries> {
        return buildVehicleItineraries(await this.findManyByCalendarId(params));
    }
}
```

（`operation.calendarId` の列名は `src/libs/operation/infrastructure/models/operation.model.ts` で確かめる。違えば合わせる）

- [ ] **Step 4: テストを通す**

Run: `npm run test -- itinerary-segment.query`
Expected: PASS

- [ ] **Step 5: 本番の形で引けるか読み取りで確かめる**（Supabase MCP `execute_sql`。今の平日ダイヤの calendar_id で、区間の数と、時刻の欠けた区間の数を数える）

```sql
select count(*) total,
       count(*) filter (where st.departure_time is null or et.arrival_time is null) missing
from trip_operation_lists tol
join operations o on o.id = tol.operation_id
join times st on st.id = tol.start_time_id
join times et on et.id = tol.end_time_id
where o.calendar_id = '<平日ダイヤの id>';
```

Expected: total は 1,000〜2,000 程度、missing は 0。0 でなければ、どの列車かを引いてユーザーに報告する（落とした区間は行程表に入らない）

- [ ] **Step 6: コミット**

```bash
git add src/libs/calendar
git commit -m "feat: :sparkles: カレンダーの区間を行程表の材料として引く"
```

---

### Task 5: 「次の区間」の書き込みを検める

**Files:**
- Create: `src/libs/trip-block/usecase/next-segment.validator.ts`
- Test: `src/libs/trip-block/usecase/next-segment.validator.spec.ts`
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`（`createManyTripBlocks`・`replaceOneTripBlock` の保存の前に呼ぶ）
- Modify: `src/libs/trip-block/trip-block.libs.module.ts` または `trip-block.v3.module.ts`（`CalendarLibsModule` を import）

**Interfaces:**
- Consumes: `ItinerarySegmentQuery.findManyByCalendarId`（Task 4）
- Produces: `validateNextSegments(params: { existing: ItinerarySegment[]; proposed: { id: string | undefined; nextTripOperationListId?: string | null }[] }): void`（違反で `UseCaseError` を投げる）

検めること:
1. 指す先が、同じカレンダーの運用の区間として存在する（`existing` にある）
2. 自分自身を指さない
3. 同じ区間を指す区間は 1 つだけ（提案どうし、提案と既存の両方で。提案で書き換えられる既存の区間は、提案の値で数える）
4. 「次の区間」だけをたどって輪にならない

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { UseCaseError } from 'src/core/classes/custom-error';
import { ItinerarySegment } from 'src/libs/calendar/domain/vehicle-itinerary';
import { validateNextSegments } from './next-segment.validator';

const s = (id: string, next: string | null = null): ItinerarySegment => ({
    id, tripId: id, tripBlockId: id, operationId: 'o', operationNumber: '1',
    startStationId: 'a', endStationId: 'b', startSeconds: 0, endSeconds: 1,
    nextTripOperationListId: next,
});

describe('validateNextSegments', () => {
    it('ふつうのつながりは通す', () => {
        expect(() => validateNextSegments({ existing: [s('a'), s('b')], proposed: [{ id: 'a', nextTripOperationListId: 'b' }] })).not.toThrow();
    });
    it('送られなかった・null は検めない', () => {
        expect(() => validateNextSegments({ existing: [s('a')], proposed: [{ id: 'a' }, { id: undefined, nextTripOperationListId: null }] })).not.toThrow();
    });
    it('ほかのカレンダーの区間（existing に無い）は拒む', () => {
        expect(() => validateNextSegments({ existing: [s('a')], proposed: [{ id: 'a', nextTripOperationListId: 'zzz' }] })).toThrow(UseCaseError);
    });
    it('自分自身は拒む', () => {
        expect(() => validateNextSegments({ existing: [s('a')], proposed: [{ id: 'a', nextTripOperationListId: 'a' }] })).toThrow(UseCaseError);
    });
    it('すでに別の区間が指している区間は拒む', () => {
        expect(() => validateNextSegments({ existing: [s('a'), s('b'), s('c', 'b')], proposed: [{ id: 'a', nextTripOperationListId: 'b' }] })).toThrow(UseCaseError);
    });
    it('指していた既存の区間を、同じ書き込みで外すなら通す', () => {
        expect(() => validateNextSegments({ existing: [s('a'), s('b'), s('c', 'b')], proposed: [{ id: 'a', nextTripOperationListId: 'b' }, { id: 'c', nextTripOperationListId: null }] })).not.toThrow();
    });
    it('輪になるつながりは拒む', () => {
        expect(() => validateNextSegments({ existing: [s('a'), s('b', 'a')], proposed: [{ id: 'a', nextTripOperationListId: 'b' }] })).toThrow(UseCaseError);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- next-segment.validator`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
import { UseCaseError } from 'src/core/classes/custom-error';
import { ItinerarySegment } from 'src/libs/calendar/domain/vehicle-itinerary';

/** 「次の区間」の書き込みを検める（spec 4.6）。違反は UseCaseError（422 相当）で返す */
export function validateNextSegments(params: {
    existing: ItinerarySegment[];
    proposed: { id: string | undefined; nextTripOperationListId?: string | null }[];
}): void {
    const { existing, proposed } = params;
    const exists = new Set(existing.map((o) => o.id));
    // 書き込み後の「次の区間」。送られなかった値（undefined）は今のまま
    const after = new Map(existing.map((o) => [o.id, o.nextTripOperationListId]));
    for (const p of proposed) {
        if (p.nextTripOperationListId === undefined) continue;
        if (p.nextTripOperationListId !== null) {
            if (!exists.has(p.nextTripOperationListId)) {
                throw new UseCaseError('次の区間は同じダイヤの運用の区間を選んでください', { nextTripOperationListId: p.nextTripOperationListId, reason: 'next_segment_not_found' });
            }
            if (p.id && p.id === p.nextTripOperationListId) {
                throw new UseCaseError('次の区間に自分自身は選べません', { id: p.id, reason: 'next_segment_self' });
            }
        }
        if (p.id) after.set(p.id, p.nextTripOperationListId);
    }

    const pointed = new Map<string, number>();
    const targets = [
        ...after.values(),
        ...proposed.filter((p) => !p.id).map((p) => p.nextTripOperationListId),
    ];
    for (const to of targets) {
        if (!to) continue;
        pointed.set(to, (pointed.get(to) ?? 0) + 1);
        if (pointed.get(to)! > 1) {
            throw new UseCaseError('この区間はすでに別の区間の次の区間になっています', { nextTripOperationListId: to, reason: 'next_segment_duplicated' });
        }
    }

    for (const start of after.keys()) {
        const seen = new Set<string>();
        let cur: string | null | undefined = start;
        while (cur) {
            if (seen.has(cur)) {
                throw new UseCaseError('次の区間が輪になっています', { id: start, reason: 'next_segment_cycle' });
            }
            seen.add(cur);
            cur = after.get(cur);
        }
    }
}
```

- [ ] **Step 4: サービスにつなぐ**

`TripBlockV3Service` のコンストラクタに `private readonly itinerarySegmentQuery: ItinerarySegmentQuery` を足し、保存の前に呼ぶ:

```ts
    /** 書き込む区間の「次の区間」を、そのダイヤの区間と突き合わせて検める */
    async #validateNextSegments(trips: { calendarId: string; tripOperationLists?: { id?: string; nextTripOperationListId?: string | null }[] }[]): Promise<void> {
        const byCalendar = new Map<string, { id: string | undefined; nextTripOperationListId?: string | null }[]>();
        for (const trip of trips) {
            const lists = (trip.tripOperationLists ?? []).map((o) => ({ id: o.id, nextTripOperationListId: o.nextTripOperationListId }));
            if (!lists.some((o) => o.nextTripOperationListId)) continue;
            byCalendar.set(trip.calendarId, [...(byCalendar.get(trip.calendarId) ?? []), ...lists]);
        }
        for (const [calendarId, proposed] of byCalendar) {
            validateNextSegments({ existing: await this.itinerarySegmentQuery.findManyByCalendarId({ calendarId }), proposed });
        }
    }
```

`createManyTripBlocks` の先頭で `await this.#validateNextSegments(dtos.flatMap((o) => o.trips));`、`replaceOneTripBlock` の先頭で `await this.#validateNextSegments(dto.trips);` を呼ぶ（DTO の列車の配列の名前は `create-trip-block.dto.ts`・`replace-trip-block.dto.ts` で確かめる）。

- [ ] **Step 5: サービスのテストを足す**（`trip-block.v3.service.spec.ts`。`ItinerarySegmentQuery` をモックで差し、輪になる書き込みで `tripBlockCommand.replaceOneTripBlockByDomain` が呼ばれないこと）

```ts
    it('次の区間が輪になる書き込みは保存しない', async () => {
        itinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            { id: 'a', nextTripOperationListId: null }, { id: 'b', nextTripOperationListId: 'a' },
        ]);
        await expect(
            service.replaceOneTripBlock({ id: 'blk', dto: { trips: [{ calendarId: 'c', tripOperationLists: [{ id: 'a', nextTripOperationListId: 'b' }] }] } as never }),
        ).rejects.toThrow('次の区間が輪になっています');
        expect(tripBlockCommand.replaceOneTripBlockByDomain).not.toHaveBeenCalled();
    });
```

（既存の spec のモックの組み方に合わせて `itinerarySegmentQuery` を providers に足す）

- [ ] **Step 6: テストを通す**

Run: `npm run test -- next-segment.validator`
Expected: PASS

Run: `npm run test -- trip-block.v3.service`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/libs/trip-block
git commit -m "feat: :sparkles: 次の区間の書き込みを同じダイヤ・一意・輪にならないで検める"
```

---

### Task 6: 運用の前後と「次の区間」の候補を返す

**Files:**
- Create: `src/libs/operation/usecase/dtos/operation-itinerary-link.dto.ts`
- Create: `src/libs/operation/usecase/dtos/next-segment-candidate.dto.ts`
- Create: `src/libs/operation/usecase/build-operation-itinerary-links.ts`
- Test: `src/libs/operation/usecase/build-operation-itinerary-links.spec.ts`
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`
- Modify: `src/libs/operation/operation.v3.module.ts`（`CalendarLibsModule` を import）

**Interfaces:**
- Consumes: `ItinerarySegmentQuery.buildByCalendarId`・`findManyByCalendarId`（Task 4）
- Produces:
  - `GET /v3/operations/calendar/:calendarId/itinerary-links` → `OperationItineraryLinkDto[]`（`CACHE_CONTROL.TIMETABLE`）
  - `GET /v3/operations/calendar/:calendarId/next-segment-candidates?stationId=&afterSeconds=` → `NextSegmentCandidateDto[]`（`CACHE_CONTROL.TIMETABLE`）

```ts
// operation-itinerary-link.dto.ts
import { Expose } from 'class-transformer';

export class ItineraryLinkEndDto {
    @Expose() tripOperationListId: string;
    @Expose() tripId: string;
    @Expose() operationId: string;
    @Expose() operationNumber: string;
    /** 切り替わる駅（前なら来た区間の終わる駅、次なら移る区間の始まる駅） */
    @Expose() stationId: string;
    @Expose() rule: 1 | 2 | 3;
}

/** 運番が変わるつながりだけを、区間ごとに返す（同じ運番どうしのつながりは返さない） */
export class OperationItineraryLinkDto {
    @Expose() tripOperationListId: string;
    @Expose() tripId: string;
    @Expose() operationId: string;
    @Expose() previous: ItineraryLinkEndDto | null;
    @Expose() next: ItineraryLinkEndDto | null;
}
```

```ts
// next-segment-candidate.dto.ts
import { Expose } from 'class-transformer';

export class NextSegmentCandidateDto {
    @Expose() tripOperationListId: string;
    @Expose() tripId: string;
    @Expose() operationId: string;
    @Expose() operationNumber: string;
    @Expose() startStationId: string;
    @Expose() startSeconds: number;
    /** すでに別の区間の「次の区間」になっているか（選べるが、保存で拒まれる） */
    @Expose() isTaken: boolean;
}
```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { buildVehicleItineraries, ItinerarySegment } from 'src/libs/calendar/domain/vehicle-itinerary';
import { buildNextSegmentCandidates, buildOperationItineraryLinks } from './build-operation-itinerary-links';

const seg = (p: Partial<ItinerarySegment> & Pick<ItinerarySegment, 'id' | 'operationNumber'>): ItinerarySegment => ({
    tripId: p.id, tripBlockId: p.id, operationId: `op-${p.operationNumber}`,
    startStationId: 'X', endStationId: 'Y', startSeconds: 0, endSeconds: 0, nextTripOperationListId: null, ...p,
});

describe('buildOperationItineraryLinks', () => {
    const a = seg({ id: 'a', operationNumber: '11K', endStationId: 'ebina', startSeconds: 100, endSeconds: 200, nextTripOperationListId: 'b' });
    const b = seg({ id: 'b', operationNumber: '12K', startStationId: 'ebina', startSeconds: 300, endSeconds: 400 });
    const c = seg({ id: 'c', operationNumber: '12K', startSeconds: 500, endSeconds: 600 });

    it('運番が変わるところだけ前後を返す', () => {
        const links = buildOperationItineraryLinks(buildVehicleItineraries([a, b, c]));
        expect(links).toEqual([
            { tripOperationListId: 'a', tripId: 'a', operationId: 'op-11K', previous: null,
              next: { tripOperationListId: 'b', tripId: 'b', operationId: 'op-12K', operationNumber: '12K', stationId: 'ebina', rule: 2 } },
            { tripOperationListId: 'b', tripId: 'b', operationId: 'op-12K', next: null,
              previous: { tripOperationListId: 'a', tripId: 'a', operationId: 'op-11K', operationNumber: '11K', stationId: 'ebina', rule: 2 } },
        ]);
    });

    it('候補: その駅でそのあと始まる区間を時刻順に、指されているかを付けて返す', () => {
        const d = seg({ id: 'd', operationNumber: '38G', startStationId: 'ebina', startSeconds: 250, endSeconds: 900 });
        const early = seg({ id: 'e', operationNumber: '01K', startStationId: 'ebina', startSeconds: 50, endSeconds: 90 });
        const out = buildNextSegmentCandidates([a, b, c, d, early], { stationId: 'ebina', afterSeconds: 200 });
        expect(out.map((o) => [o.tripOperationListId, o.isTaken])).toEqual([['d', false], ['b', true]]);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- build-operation-itinerary-links`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
import { ItineraryLink, ItinerarySegment, VehicleItineraries } from 'src/libs/calendar/domain/vehicle-itinerary';
import { NextSegmentCandidateDto } from './dtos/next-segment-candidate.dto';
import { ItineraryLinkEndDto, OperationItineraryLinkDto } from './dtos/operation-itinerary-link.dto';

const end = (link: ItineraryLink, stationId: string): ItineraryLinkEndDto => ({
    tripOperationListId: link.segment.id,
    tripId: link.segment.tripId,
    operationId: link.segment.operationId,
    operationNumber: link.segment.operationNumber,
    stationId,
    rule: link.rule,
});

/** 運番が変わるつながりを区間ごとに返す（運用表・行路図の「← 11K から」「→ 12K へ」用） */
export function buildOperationItineraryLinks(itineraries: VehicleItineraries): OperationItineraryLinkDto[] {
    const out: OperationItineraryLinkDto[] = [];
    for (const s of itineraries.itineraries.flat()) {
        const prev = itineraries.previousOf(s.id);
        const next = itineraries.nextOf(s.id);
        const previous = prev && prev.segment.operationNumber !== s.operationNumber ? end(prev, prev.segment.endStationId) : null;
        const nextEnd = next && next.segment.operationNumber !== s.operationNumber ? end(next, next.segment.startStationId) : null;
        if (!previous && !nextEnd) continue;
        out.push({ tripOperationListId: s.id, tripId: s.tripId, operationId: s.operationId, previous, next: nextEnd });
    }
    return out;
}

/** 「次の区間」の候補。その駅でそのあと始まる区間を時刻順に（spec 3.6 決まり 2・5.3） */
export function buildNextSegmentCandidates(
    segments: ItinerarySegment[],
    params: { stationId: string; afterSeconds: number },
): NextSegmentCandidateDto[] {
    const taken = new Set(segments.map((o) => o.nextTripOperationListId).filter((o): o is string => !!o));
    return segments
        .filter((o) => o.startStationId === params.stationId && o.startSeconds >= params.afterSeconds)
        .sort((a, b) => a.startSeconds - b.startSeconds)
        .slice(0, 20)
        .map((o) => ({
            tripOperationListId: o.id,
            tripId: o.tripId,
            operationId: o.operationId,
            operationNumber: o.operationNumber,
            startStationId: o.startStationId,
            startSeconds: o.startSeconds,
            isTaken: taken.has(o.id),
        }));
}
```

- [ ] **Step 4: サービスと取得口を足す**

`OperationV3Service`（コンストラクタに `private readonly itinerarySegmentQuery: ItinerarySegmentQuery`）:

```ts
    async findManyItineraryLinks(params: { calendarId: string }): Promise<OperationItineraryLinkDto[]> {
        return buildOperationItineraryLinks(await this.itinerarySegmentQuery.buildByCalendarId(params));
    }

    async findManyNextSegmentCandidates(params: { calendarId: string; stationId: string; afterSeconds: number }): Promise<NextSegmentCandidateDto[]> {
        const { calendarId, ...rest } = params;
        return buildNextSegmentCandidates(await this.itinerarySegmentQuery.findManyByCalendarId({ calendarId }), rest);
    }
```

`OperationV3Controller`（`/calendar/:calendarId/trips` の下。`/:id/...` より前に置く）:

```ts
    /** 運番が変わる車両のつながり（運用表・行路図の前後の運用用） */
    @Get('/calendar/:calendarId/itinerary-links')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    findManyItineraryLinks(@Param('calendarId') calendarId: string): Promise<OperationItineraryLinkDto[]> {
        return this.operationV3Service.findManyItineraryLinks({ calendarId });
    }

    /** 「次の区間」の候補。`stationId` で始まり、`afterSeconds`（鉄道日の 0 時からの秒）以降の区間 */
    @Get('/calendar/:calendarId/next-segment-candidates')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    findManyNextSegmentCandidates(
        @Param('calendarId') calendarId: string,
        @Query('stationId') stationId: string,
        @Query('afterSeconds') afterSeconds: string,
    ): Promise<NextSegmentCandidateDto[]> {
        return this.operationV3Service.findManyNextSegmentCandidates({ calendarId, stationId, afterSeconds: Number(afterSeconds) || 0 });
    }
```

- [ ] **Step 5: テストを通す**

Run: `npm run test -- build-operation-itinerary-links`
Expected: PASS

Run: `npm run test -- operation`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add src/libs/operation
git commit -m "feat: :sparkles: 運用の前後のつながりと次の区間の候補を返す"
```

---

### Task 7: 時刻断面で目撃を引き継ぐ

**Files:**
- Create: `src/libs/operation-sighting/usecase/operation-sighting.v3.carry-over.ts`
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.carry-over.spec.ts`
- Modify: `src/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto.ts`
- Modify: `src/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`（今日の目撃を引く口を足す）
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`（足す）

**Interfaces:**
- Consumes: `VehicleItineraries`（Task 3）・`ItinerarySegmentQuery.buildByCalendarId`（Task 4）
- Produces:
  - `OperationSightingTimeCrossSectionDto.sightedAsOperation?: { operationId: string; operationNumber: string } | null`
  - `OperationSightingQuery.findManyValidBySightingTimeRange({ start, end }): Promise<OperationSightingDetailsDto[]>`（operation・formation つき・無効化を除く・新しい順）
  - `resolveCarriedSightingForOperation(...)`・`resolveCarriedSightingForFormation(...)`（下）

決め方:
- **運番の側**: その時刻にその運番を受け持つ区間 → その行程表。今日の目撃を新しい順に見て、「その目撃の運番・時刻の区間」が同じ行程表に入る最初のものを選ぶ。選んだ編成の、今日いちばん新しい目撃も同じ行程表に入っていなければ、追い出されたとして `null`
- **編成の側**: その編成の今日いちばん新しい目撃 → 区間 → 行程表。その行程表の今日いちばん新しい目撃がほかの編成なら追い出されたとして `null`。そうでなければ、今の時刻にその行程表で車両がいる区間の運番を返す
- 運番が今日の区間を 1 つも持たないとき（区間の無い運用など）は `undefined` を返し、今の判定（日をまたぐ巡回を含む）へそのまま落とす
- 引き継いだときは、`latestSighting` に引き継いだ目撃そのものを入れる（目撃時刻・太字の判定がその目撃で決まるように）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import dayjs from 'dayjs';
import { buildVehicleItineraries, ItinerarySegment } from 'src/libs/calendar/domain/vehicle-itinerary';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { resolveCarriedSightingForFormation, resolveCarriedSightingForOperation } from './operation-sighting.v3.carry-over';

const t = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 3600 + m * 60; };
const seg = (p: Partial<ItinerarySegment> & Pick<ItinerarySegment, 'id' | 'operationNumber'>): ItinerarySegment => ({
    tripId: p.id, tripBlockId: `b-${p.id}`, operationId: `op-${p.operationNumber}`,
    startStationId: 'X', endStationId: 'Y', startSeconds: 0, endSeconds: 0, nextTripOperationListId: null, ...p,
});
const day = '2026-10-12';
const sighting = (id: string, operationNumber: string, formationNumber: string, hhmm: string) =>
    ({
        id, operationSightingId: id, operationId: `op-${operationNumber}`,
        sightingTime: dayjs(`${day} ${hhmm}`).toDate(),
        operation: { operationId: `op-${operationNumber}`, operationNumber },
        formation: { formationId: `f-${formationNumber}`, formationNumber },
    }) as unknown as OperationSightingDetailsDto;

// 海老名: 11K（〜8:22）→ 12K（8:30〜）
const ebina = buildVehicleItineraries([
    seg({ id: 'k11', operationNumber: '11K', startSeconds: t('06:00'), endSeconds: t('08:22'), nextTripOperationListId: 'k12' }),
    seg({ id: 'k12', operationNumber: '12K', startSeconds: t('08:30'), endSeconds: t('20:00') }),
]);
// 赤羽岩淵: 朝の 02K（P）は 18:32 から 18K、18:32 以降の 02K は別の車両（Q）
const akabane = buildVehicleItineraries([
    seg({ id: 'P02', operationNumber: '02K', startSeconds: t('06:00'), endSeconds: t('07:00') }),
    seg({ id: 'B02', tripBlockId: 'bB', operationNumber: '02K', endStationId: 'ak', startSeconds: t('18:10'), endSeconds: t('18:32') }),
    seg({ id: 'B18', tripBlockId: 'bB', operationNumber: '18K', startStationId: 'ak', startSeconds: t('18:32'), endSeconds: t('19:40') }),
    seg({ id: 'A18', tripBlockId: 'bA', operationNumber: '18K', endStationId: 'ak', startSeconds: t('17:00'), endSeconds: t('18:32') }),
    seg({ id: 'A02', tripBlockId: 'bA', operationNumber: '02K', startStationId: 'ak', startSeconds: t('18:32'), endSeconds: t('18:50') }),
]);
const at = (hhmm: string) => dayjs(`${day} ${hhmm}`);

describe('resolveCarriedSightingForOperation', () => {
    it('11K で目撃された編成は 12K でも目撃扱い・元の運番を添える', () => {
        const r = resolveCarriedSightingForOperation({ itineraries: ebina, sightings: [sighting('s1', '11K', '10701', '07:00')], operationNumber: '12K', searchTime: at('09:00') });
        expect(r?.sighting.id).toBe('s1');
        expect(r?.sightedAsOperation).toEqual({ operationId: 'op-11K', operationNumber: '11K' });
    });
    it('12K で目撃された編成は 11K でも目撃扱い（逆向き）', () => {
        const r = resolveCarriedSightingForOperation({ itineraries: ebina, sightings: [sighting('s1', '12K', '10701', '09:00')], operationNumber: '11K', searchTime: at('09:30') });
        expect(r?.sightedAsOperation?.operationNumber).toBe('12K');
    });
    it('直接の目撃には元の運番を付けない', () => {
        const r = resolveCarriedSightingForOperation({ itineraries: ebina, sightings: [sighting('s1', '12K', '10701', '09:00')], operationNumber: '12K', searchTime: at('09:30') });
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('朝の 02K の目撃は 18:32 以降の 18K に出て、18:32 以降の 02K には出ない', () => {
        const sightings = [sighting('s1', '02K', '10701', '06:30')];
        expect(resolveCarriedSightingForOperation({ itineraries: akabane, sightings, operationNumber: '18K', searchTime: at('19:00') })?.sighting.id).toBe('s1');
        expect(resolveCarriedSightingForOperation({ itineraries: akabane, sightings, operationNumber: '02K', searchTime: at('18:40') })).toBeNull();
    });
    it('引き継いだ先でもっと新しい直接の目撃があればそちらが勝つ', () => {
        const sightings = [sighting('s2', '12K', '10702', '09:00'), sighting('s1', '11K', '10701', '07:00')];
        expect(resolveCarriedSightingForOperation({ itineraries: ebina, sightings, operationNumber: '11K', searchTime: at('09:30') })?.sighting.id).toBe('s2');
    });
    it('その編成があとで別の行程表で目撃されていれば追い出されている', () => {
        const sightings = [sighting('s2', '02K', '10701', '06:30'), sighting('s1', '11K', '10701', '06:10')];
        const both = buildVehicleItineraries([...ebina.itineraries.flat(), ...akabane.itineraries.flat()]);
        expect(resolveCarriedSightingForOperation({ itineraries: both, sightings, operationNumber: '12K', searchTime: at('09:00') })).toBeNull();
    });
    it('検索時刻より後の目撃は使わない', () => {
        expect(resolveCarriedSightingForOperation({ itineraries: ebina, sightings: [sighting('s1', '11K', '10701', '10:00')], operationNumber: '12K', searchTime: at('09:00') })).toBeNull();
    });
    it('今日の区間が無い運番は undefined（今の判定へ落とす）', () => {
        expect(resolveCarriedSightingForOperation({ itineraries: ebina, sightings: [], operationNumber: '99X', searchTime: at('09:00') })).toBeUndefined();
    });
});

describe('resolveCarriedSightingForFormation', () => {
    it('11K で目撃された編成は、9:00 には 12K にいる', () => {
        const r = resolveCarriedSightingForFormation({ itineraries: ebina, sightings: [sighting('s1', '11K', '10701', '07:00')], formationNumber: '10701', searchTime: at('09:00') });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sightedAsOperation?.operationNumber).toBe('11K');
    });
    it('同じ行程表でほかの編成があとから目撃されていれば追い出されている', () => {
        const sightings = [sighting('s2', '12K', '10702', '09:00'), sighting('s1', '11K', '10701', '07:00')];
        expect(resolveCarriedSightingForFormation({ itineraries: ebina, sightings, formationNumber: '10701', searchTime: at('09:30') })).toBeNull();
    });
    it('今日の目撃が無ければ undefined（今の判定へ落とす）', () => {
        expect(resolveCarriedSightingForFormation({ itineraries: ebina, sightings: [], formationNumber: '10701', searchTime: at('09:00') })).toBeUndefined();
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- operation-sighting.v3.carry-over`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
import dayjs from 'dayjs';
import { getBaseDate } from 'src/core/utils/datetime';
import { VehicleItineraries } from 'src/libs/calendar/domain/vehicle-itinerary';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';

/**
 * 目撃の引き継ぎ（spec 4.6）。同じ行程表に入っている区間は同じ編成として扱う（両向き）。
 * 目撃は「その時刻にその運番を受け持っていた区間」に結び付ける。
 * undefined は「行程表で判定できない（今日の区間・目撃が無い）」で、呼び出し側は今の判定へ落とす。
 */
export type SightedAsOperation = { operationId: string; operationNumber: string };

const secondsOf = (time: Date) => {
    const t = dayjs(time);
    return t.diff(getBaseDate(t), 'second');
};

/** 目撃 → その行程表の番号 */
function itineraryOfSighting(itineraries: VehicleItineraries, s: OperationSightingDetailsDto): number | undefined {
    const number = s.operation?.operationNumber;
    if (!number) return undefined;
    const segment = itineraries.segmentOfOperationAt(number, secondsOf(s.sightingTime));
    return segment ? itineraries.itineraryIndexOf(segment.id) : undefined;
}

/** 検索時刻までの目撃を新しい順に */
const usable = (sightings: OperationSightingDetailsDto[], searchTime: dayjs.Dayjs) =>
    sightings
        .filter((s) => !dayjs(s.sightingTime).isAfter(searchTime))
        .sort((a, b) => dayjs(b.sightingTime).valueOf() - dayjs(a.sightingTime).valueOf());

const sightedAs = (s: OperationSightingDetailsDto, operationNumber: string): SightedAsOperation | null =>
    s.operation && s.operation.operationNumber !== operationNumber
        ? { operationId: s.operationId, operationNumber: s.operation.operationNumber }
        : null;

export function resolveCarriedSightingForOperation(params: {
    itineraries: VehicleItineraries;
    /** その鉄道日の有効な目撃 */
    sightings: OperationSightingDetailsDto[];
    operationNumber: string;
    searchTime: dayjs.Dayjs;
}): { sighting: OperationSightingDetailsDto; sightedAsOperation: SightedAsOperation | null } | null | undefined {
    const { itineraries, operationNumber, searchTime } = params;
    const current = itineraries.segmentOfOperationAt(operationNumber, secondsOf(searchTime.toDate()));
    if (!current) return undefined;
    const index = itineraries.itineraryIndexOf(current.id);
    const sightings = usable(params.sightings, searchTime);

    const hit = sightings.find((s) => itineraryOfSighting(itineraries, s) === index);
    if (!hit) return null;
    const formationNumber = hit.formation?.formationNumber;
    const latestOfFormation = sightings.find((s) => s.formation?.formationNumber === formationNumber);
    if (latestOfFormation && itineraryOfSighting(itineraries, latestOfFormation) !== index) return null;
    return { sighting: hit, sightedAsOperation: sightedAs(hit, operationNumber) };
}

export function resolveCarriedSightingForFormation(params: {
    itineraries: VehicleItineraries;
    sightings: OperationSightingDetailsDto[];
    formationNumber: string;
    searchTime: dayjs.Dayjs;
}): { sighting: OperationSightingDetailsDto; operationNumber: string; sightedAsOperation: SightedAsOperation | null } | null | undefined {
    const { itineraries, formationNumber, searchTime } = params;
    const sightings = usable(params.sightings, searchTime);
    const own = sightings.find((s) => s.formation?.formationNumber === formationNumber);
    if (!own) return undefined;
    const index = itineraryOfSighting(itineraries, own);
    if (index === undefined) return undefined;
    const latestInItinerary = sightings.find((s) => itineraryOfSighting(itineraries, s) === index);
    if (latestInItinerary?.formation?.formationNumber !== formationNumber) return null;
    const segment = itineraries.segmentOfItineraryAt(index, secondsOf(searchTime.toDate()));
    if (!segment) return undefined;
    return { sighting: own, operationNumber: segment.operationNumber, sightedAsOperation: sightedAs(own, segment.operationNumber) };
}
```

- [ ] **Step 4: テストを通す**

Run: `npm run test -- operation-sighting.v3.carry-over`
Expected: PASS（11 件）

- [ ] **Step 5: DTO に足す**（`operation-sighting-time-cross-section.dto.ts`）

```ts
    /** 引き継いだ目撃のとき、目撃されたときの運用（例: 12K の断面で 11K として目撃）。直接の目撃は null */
    @Expose()
    sightedAsOperation?: { operationId: string; operationNumber: string } | null;
```

- [ ] **Step 6: 今日の目撃を引く口を足す**（`operation-sighting.query.ts`。`findManyBySpecificPeriod` の下）

```ts
    /** 期間内の有効な目撃を、運用・編成つきで新しい順に（目撃の引き継ぎ用） */
    async findManyValidBySightingTimeRange(params: {
        start: dayjs.Dayjs;
        end: dayjs.Dayjs;
    }): Promise<OperationSightingDetailsDto[]> {
        const models = await this.operationSightingRepository
            .createQueryBuilder('sighting')
            .leftJoinAndSelect('sighting.operation', 'operation')
            .leftJoinAndSelect('sighting.formation', 'formation')
            .where('sighting.sightingTime BETWEEN :start AND :end', {
                start: params.start.toISOString(),
                end: params.end.toISOString(),
            })
            .andWhere((qb) => {
                const sub = qb
                    .subQuery()
                    .select('1')
                    .from(OperationSightingInvalidationModel, 'inv')
                    .where('inv.operationSightingId = sighting.id')
                    .getQuery();
                return `NOT EXISTS ${sub}`;
            })
            .orderBy('sighting.sightingTime', 'DESC')
            .addOrderBy('sighting.updatedAt', 'DESC')
            .getMany();

        return OperationSightingsDtoBuilder.buildFromModel(models);
    }
```

`operation-sighting.query.spec.ts` に、`NOT EXISTS` が付くことと新しい順を確かめるテストを既存の書き方で足す（`buildChainableQueryBuilder` の対象メソッドに `andWhere`・`orderBy`・`addOrderBy` を足す）。

- [ ] **Step 7: サービスにつなぐ**

`TimeCrossSectionSource` に 2 つ足す:

```ts
    itineraries(calendarId: string): Promise<VehicleItineraries>;
    /** その鉄道日の 4 時から検索時刻までの有効な目撃 */
    todaySightings(): Promise<OperationSightingDetailsDto[]>;
```

`#createDirectSource`:

```ts
            itineraries: (calendarId) => this.itinerarySegmentQuery.buildByCalendarId({ calendarId }),
            todaySightings: () =>
                this.operationSightingQuery.findManyValidBySightingTimeRange({
                    start: getBaseDate(searchTimeInstance).hour(4),
                    end: searchTimeInstance,
                }),
```

`#createBulkSource` の返り値（同じ引数なら 1 回だけ）:

```ts
            itineraries: (calendarId) => memo(itineraryCache, calendarId, () => direct.itineraries(calendarId)),
            todaySightings: () => memo(todayCache, '', () => direct.todaySightings()),
```

（`const itineraryCache = new Map<string, Promise<VehicleItineraries>>(); const todayCache = new Map<string, Promise<OperationSightingDetailsDto[]>>();` を他の memo 表の並びに足す。コンストラクタに `private readonly itinerarySegmentQuery: ItinerarySegmentQuery` を足し、`operation-sighting.libs.module.ts` か v3 モジュールで `CalendarLibsModule` の export を使えるようにする）

`#timeCrossSectionByOperationNumber` の、`latestSighting` と `calendar` を取った直後（`if (!latestSighting)` より前）に入れる:

```ts
        if (calendar) {
            const carried = resolveCarriedSightingForOperation({
                itineraries: await source.itineraries(calendar.id),
                sightings: await source.todaySightings(),
                operationNumber,
                searchTime: searchTimeInstance,
            });
            if (carried) {
                const { sighting, sightedAsOperation } = carried;
                const operations = await source.operationsOf(calendar.id);
                const operation = operations.find((o) => o.operationNumber === operationNumber) ?? sighting.operation;
                return {
                    latestSighting: sighting,
                    expectedSighting: sighting.formation && operation ? { operation, formation: sighting.formation } : null,
                    sightedAsOperation,
                };
            }
            // 今日の行程表で判定でき、該当なし（別の車両・追い出し）。今日の直接の目撃が別の車両のものなら出さない
            if (carried === null && latestSighting && searchBaseDate.isSame(getBaseDate(dayjs(latestSighting.sightingTime)))) {
                return { latestSighting, expectedSighting: null, sightedAsOperation: null };
            }
        }
```

`#timeCrossSectionByFormationNumber` も同じ位置に:

```ts
        if (calendar) {
            const carried = resolveCarriedSightingForFormation({
                itineraries: await source.itineraries(calendar.id),
                sightings: await source.todaySightings(),
                formationNumber,
                searchTime: searchTimeInstance,
            });
            if (carried) {
                const operations = await source.operationsOf(calendar.id);
                const operation = operations.find((o) => o.operationNumber === carried.operationNumber) ?? null;
                return {
                    latestSighting: carried.sighting,
                    expectedSighting: operation && carried.sighting.formation ? { operation, formation: carried.sighting.formation } : null,
                    sightedAsOperation: carried.sightedAsOperation,
                };
            }
            if (carried === null) {
                return { latestSighting, expectedSighting: null, sightedAsOperation: null };
            }
        }
```

ほかの return はそのまま（`sightedAsOperation` は任意なので付けなくてよい。client は undefined を null と同じに扱う）。休車（100）は区間を持たないので `undefined` になり、今の判定へ落ちる。

- [ ] **Step 8: サービスのテストを足す**（`operation-sighting.v3.service.spec.ts`。既存のモックの組み方に `itinerarySegmentQuery.buildByCalendarId` と `operationSightingQuery.findManyValidBySightingTimeRange` を足す）

```ts
    describe('目撃の引き継ぎ', () => {
        it('12K の断面に 11K の目撃を出し、元の運番を添える', async () => {
            // calendar・operations・buildByCalendarId（海老名の 2 区間）・findManyValidBySightingTimeRange（11K の 07:00）を設定
            const result = await service.findOneTimeCrossSectionByOperationNumber({ operationNumber: '12K', searchTime: '2026-10-12T09:00:00+09:00' });
            expect(result.expectedSighting?.formation?.formationNumber).toBe('10701');
            expect(result.sightedAsOperation).toEqual({ operationId: 'op-11K', operationNumber: '11K' });
        });

        it('まとめて返す口でも、行程表と今日の目撃は 1 回ずつしか引かない', async () => {
            await service.findManyTimeCrossSectionsByOperationNumbers({ operationNumbers: ['11K', '12K', '02K'], searchTime: '2026-10-12T09:00:00+09:00' });
            expect(itinerarySegmentQuery.buildByCalendarId).toHaveBeenCalledTimes(1);
            expect(operationSightingQuery.findManyValidBySightingTimeRange).toHaveBeenCalledTimes(1);
        });
    });
```

（モックの値は Step 1 のテストの `seg`・`sighting` と同じ形で組む。既存の「同じ日・追い出し」のテストが行程表で判定される経路に変わって落ちるなら、`buildByCalendarId` を「区間なし」（`buildVehicleItineraries([])`）にして今の判定の経路を守る）

- [ ] **Step 9: テストを通す**

Run: `npm run test -- operation-sighting`
Expected: PASS

- [ ] **Step 10: コミット**

```bash
git add src/libs/operation-sighting
git commit -m "feat: :sparkles: 目撃を車両の行程表で引き継ぎ、元の運用番号を添えて返す"
```

---

### Task 8: 期間の目撃一覧に引き継いだ目撃を足す（過去の運用情報用）

**Files:**
- Create: `src/libs/operation-sighting/usecase/build-carried-sightings.ts`
- Test: `src/libs/operation-sighting/usecase/build-carried-sightings.spec.ts`
- Modify: `src/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（`findManyBySpecificPeriod`）
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`

**Interfaces:**
- Consumes: Task 3・4・`CalendarQuery.findOneBySpecificDate`・`OperationQuery.findManyByCalendarId`
- Produces: `GET /v3/operation-sightings/from/:start/to/:end?includeCarriedOver=true`。引き継いだ目撃は `id` が `<元の id>#<運番>`、`operationId`・`operation` が引き継いだ先、`sightedAsOperation` が元の運用。直接の目撃は `sightedAsOperation` なし。並びは今と同じ目撃時刻の古い順

- [ ] **Step 1: 失敗するテストを書く**

```ts
import dayjs from 'dayjs';
import { buildVehicleItineraries, ItinerarySegment } from 'src/libs/calendar/domain/vehicle-itinerary';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { buildCarriedSightings } from './build-carried-sightings';

const t = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 3600 + m * 60; };
const seg = (p: Partial<ItinerarySegment> & Pick<ItinerarySegment, 'id' | 'operationNumber'>): ItinerarySegment => ({
    tripId: p.id, tripBlockId: `b-${p.id}`, operationId: `op-${p.operationNumber}`,
    startStationId: 'X', endStationId: 'Y', startSeconds: 0, endSeconds: 0, nextTripOperationListId: null, ...p,
});
const ebina = buildVehicleItineraries([
    seg({ id: 'k11', operationNumber: '11K', startSeconds: t('06:00'), endSeconds: t('08:22'), nextTripOperationListId: 'k12' }),
    seg({ id: 'k12', operationNumber: '12K', startSeconds: t('08:30'), endSeconds: t('20:00') }),
]);
const s = (id: string, op: string, f: string, hhmm: string) => ({
    id, operationSightingId: id, operationId: `op-${op}`, formationId: `f-${f}`,
    sightingTime: dayjs(`2026-10-12 ${hhmm}`).toDate(),
    operation: { operationId: `op-${op}`, operationNumber: op }, formation: { formationId: `f-${f}`, formationNumber: f },
}) as unknown as OperationSightingDetailsDto;
const operations = [
    { operationId: 'op-11K', operationNumber: '11K' },
    { operationId: 'op-12K', operationNumber: '12K' },
] as never;

describe('buildCarriedSightings', () => {
    it('11K の目撃から、12K の引き継いだ目撃を作る', () => {
        const out = buildCarriedSightings({ itineraries: ebina, sightings: [s('a', '11K', '10701', '07:00')], operations });
        expect(out).toEqual([
            expect.objectContaining({ id: 'a#12K', operationId: 'op-12K', sightedAsOperation: { operationId: 'op-11K', operationNumber: '11K' } }),
        ]);
    });
    it('同じ日に同じ編成が直接目撃されている運用には作らない', () => {
        const out = buildCarriedSightings({ itineraries: ebina, sightings: [s('a', '11K', '10701', '07:00'), s('b', '12K', '10701', '09:00')], operations });
        expect(out).toEqual([]);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npm run test -- build-carried-sightings`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
import dayjs from 'dayjs';
import { getBaseDate } from 'src/core/utils/datetime';
import { VehicleItineraries } from 'src/libs/calendar/domain/vehicle-itinerary';
import { OperationDetailsDto } from 'src/libs/operation/usecase/dtos/operation-details.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';

/**
 * 1 鉄道日ぶんの目撃から、同じ行程表のほかの運用への「引き継いだ目撃」を作る（spec 4.6・5.3 過去の運用情報）。
 * 同じ編成がその運用で直接目撃されていれば作らない。
 */
export function buildCarriedSightings(params: {
    itineraries: VehicleItineraries;
    sightings: OperationSightingDetailsDto[];
    operations: OperationDetailsDto[];
}): OperationSightingDetailsDto[] {
    const { itineraries, sightings, operations } = params;
    const direct = new Set(sightings.map((o) => `${o.formation?.formationNumber}|${o.operation?.operationNumber}`));
    const made = new Set<string>();
    const out: OperationSightingDetailsDto[] = [];
    for (const s of sightings) {
        const number = s.operation?.operationNumber;
        if (!number || !s.formation) continue;
        const time = dayjs(s.sightingTime);
        const segment = itineraries.segmentOfOperationAt(number, time.diff(getBaseDate(time), 'second'));
        const index = segment ? itineraries.itineraryIndexOf(segment.id) : undefined;
        if (index === undefined) continue;
        const others = new Set(itineraries.itineraries[index].map((o) => o.operationNumber));
        others.delete(number);
        for (const other of others) {
            const key = `${s.formation.formationNumber}|${other}`;
            if (direct.has(key) || made.has(key)) continue;
            const operation = operations.find((o) => o.operationNumber === other);
            if (!operation) continue;
            made.add(key);
            out.push({
                ...s,
                id: `${s.id}#${other}`,
                operationId: operation.operationId,
                operation,
                sightedAsOperation: { operationId: s.operationId, operationNumber: number },
            });
        }
    }
    return out;
}
```

`operation-sighting-details.dto.ts` に足す:

```ts
    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃には無い */
    @Expose()
    sightedAsOperation?: { operationId: string; operationNumber: string };
```

- [ ] **Step 4: サービスと取得口**

`findManyBySpecificPeriod` に `includeCarriedOver?: boolean` を足す。true のとき、`start`〜`end` の鉄道日ごとに、その日のカレンダー（`calendarQuery.findOneBySpecificDate`）・行程表（`itinerarySegmentQuery.buildByCalendarId`。同じカレンダーは 1 回だけ）・運用（`operationQuery.findManyByCalendarId`）を引き、その日の有効な目撃（無効化されたものは使わない）から `buildCarriedSightings` で作って足し、目撃時刻の古い順に並べ直す:

```ts
        if (!includeCarriedOver) return direct;
        const carried: OperationSightingDetailsDto[] = [];
        const itineraryCache = new Map<string, Promise<VehicleItineraries>>();
        for (let d = dayjs(start, 'YYYY-MM-DD'); !d.isAfter(dayjs(end, 'YYYY-MM-DD')); d = d.add(1, 'day')) {
            const calendar = await this.calendarQuery.findOneBySpecificDate({ date: d.format('YYYY-MM-DD') });
            if (!calendar) continue;
            if (!itineraryCache.has(calendar.id)) itineraryCache.set(calendar.id, this.itinerarySegmentQuery.buildByCalendarId({ calendarId: calendar.id }));
            const sightingsOfDay = direct.filter(
                (o) => !o.invalidation && getBaseDate(dayjs(o.sightingTime)).isSame(d, 'day'),
            );
            carried.push(...buildCarriedSightings({
                itineraries: await itineraryCache.get(calendar.id)!,
                sightings: sightingsOfDay,
                operations: await this.operationQuery.findManyByCalendarId({ calendarId: calendar.id }),
            }));
        }
        return [...direct, ...carried].sort((a, b) => dayjs(a.sightingTime).valueOf() - dayjs(b.sightingTime).valueOf());
```

（`direct` は今の `findManyBySpecificPeriod` の結果。この口の目撃は operation・formation を join していないので、`operationSightingQuery.findManyBySpecificPeriod` に `leftJoinAndSelect('sighting.operation', 'operation')`・`leftJoinAndSelect('sighting.formation', 'formation')` を足す。v2 も同じ問い合わせを使っているか `grep -n findManyBySpecificPeriod src/libs/operation-sighting/usecase/*.ts` で確かめ、v2 の応答の形が変わらないこと（項目が増えるだけ）をユーザーに伝える）

コントローラ:

```ts
        @Query('includeCarriedOver') includeCarriedOver?: string,
```

を足し、`includeCarriedOver: includeCarriedOver === 'true'` で渡す（`includeInvalidated` は今 boolean 型で受けているが、クエリ文字列は 'true'/'false' の文字列で来るので、こちらは文字列で比べる）。

- [ ] **Step 5: テストを通す**

Run: `npm run test -- operation-sighting`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add src/libs/operation-sighting
git commit -m "feat: :sparkles: 期間の目撃一覧に行程表で引き継いだ目撃を足せるようにする"
```

---

### Task 9: API の仕上げとデプロイの準備

- [ ] **Step 1: 全体のテスト・lint・ビルド**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: 新しく足したファイルにエラーなし

Run: `npm run build`
Expected: 成功

- [ ] **Step 2: ローカルで本番 DB を読んで目で確かめる**（ローカルの API は本番 Supabase を読む）。`npm run start:dev` のあと:

Run: `curl -s "http://localhost:3000/v3/operations/calendar/<平日ダイヤの id>/itinerary-links"`
Expected: マイグレーション前なので落ちる → **ここでユーザーにマイグレーションを流してもらう**（`npm run migration:run` 相当の SQL を Task 1 の up から渡す）。流したあとは `[]`（つながりはまだ入っていない）

- [ ] **Step 3: ユーザーに、海老名の 1 組だけつながりを入れてもらう**（11K 6557 の区間の次 = 12K 3808 の区間）。区間の id を引く読み取り SQL を渡し、書き込みの SQL をユーザーに流してもらう

```sql
-- 読み取り（私が MCP で引く）
select tol.id, o.operation_number, t.trip_number
from trip_operation_lists tol
join trips t on t.id = tol.trip_id
join operations o on o.id = tol.operation_id
where t.calendar_id = '<平日ダイヤの id>' and t.trip_number in ('6557', '3808');
-- 書き込み（ユーザーが流す）
update trip_operation_lists set next_trip_operation_list_id = '<3808 の 12K の区間 id>' where id = '<6557 の 11K の区間 id>';
```

Run: `curl -s "http://localhost:3000/v3/operations/calendar/<平日ダイヤの id>/itinerary-links"`
Expected: 6557 の区間に `next.operationNumber = "12K"`、3808 の区間に `previous.operationNumber = "11K"`

Run: `curl -s "http://localhost:3000/v3/operation-sightings/time-cross-section/operation-numbers?operationNumbers=11K,12K"`
Expected: 今日 11K か 12K に目撃があれば、もう一方にも同じ編成が出て、`sightedAsOperation` が付く

- [ ] **Step 4: docs のコミット**（この計画の進み具合のチェックを付けたもの）と、PR の準備。push はユーザーに `! git push` を頼み、`gh pr create` で PR を作る。マージとデプロイはユーザーの指示を待つ

---

## client（sotetsu-lab-v3-client・feature/vehicle-itinerary）

### Task 10: 型をそろえ、編集で区間とつながりを保つ

**Files:**
- Modify: `src/app/libs/trip/usecase/dtos/*`・`src/app/libs/trip/infrastructure/models/*` のうち区間の型（`grep -rln "startStationId" src/app/libs/trip` で探す）に `nextTripOperationListId?: string | null` を足す（モデルは `@Expose()` 付き）
- Modify: `src/app/libs/operation-sighting/infrastructure/models/operation-sighting-time-cross-section.model.ts`・`usecase/dtos/operation-sighting-time-cross-section.dto.ts`
- Modify: `src/app/libs/operation-sighting/infrastructure/models/operation-sighting.model.ts`・`usecase/dtos/operation-sighting-details.dto.ts`
- Modify: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-trip-form.util.ts`
- Modify: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util.ts`
- Test: 同じディレクトリの `timetable-edit-form-to-trip-dtos.util.spec.ts`（無ければ作る）

**Interfaces:**
- Produces（client の型）:
  - `OperationSightingTimeCrossSectionDto.sightedAsOperation?: { operationId: string; operationNumber: string } | null`
  - `OperationSightingDetailsDto.sightedAsOperation?: { operationId: string; operationNumber: string }`
  - 列車のフォームに `tripOperationLists`（元の区間の配列。表示しない）と `nextTripOperationListId`（区間が 1 つのときの「次の区間」）を足す

決め方:
- 区間が 0 または 1 つの列車: 今どおり運番の欄で編集する。1 つのときは元の区間の `id` と `nextTripOperationListId` を送り返す（運番・駅は今の値で上書き）
- 区間が 2 つ以上の列車（本番に 3 本）: 区間をそのまま送り返す。運番の欄は無効にし、`matHint` で「区間が複数あるため、ここでは変えられません」と出す

- [ ] **Step 1: 失敗するテストを書く**（`timetable-edit-form-to-trip-dtos.util.spec.ts`。今のファイルの export 名とフォームの組み方に合わせる）

```ts
describe('区間の送り返し', () => {
    it('区間が 1 つの列車は id と次の区間を送り返す', () => {
        const dtos = buildDtos({ operationId: 'op-11K', tripOperationLists: [{ id: 'seg-1', operationId: 'op-11K', nextTripOperationListId: 'seg-9' }], nextTripOperationListId: 'seg-9' });
        expect(dtos[0].tripOperationLists).toEqual([
            expect.objectContaining({ id: 'seg-1', operationId: 'op-11K', nextTripOperationListId: 'seg-9' }),
        ]);
    });
    it('運番を変えても id は残す', () => {
        const dtos = buildDtos({ operationId: 'op-12K', tripOperationLists: [{ id: 'seg-1', operationId: 'op-11K', nextTripOperationListId: null }], nextTripOperationListId: null });
        expect(dtos[0].tripOperationLists[0]).toEqual(expect.objectContaining({ id: 'seg-1', operationId: 'op-12K', nextTripOperationListId: null }));
    });
    it('区間が 2 つ以上の列車は区間をそのまま送り返す', () => {
        const original = [
            { id: 's1', operationId: 'op-18K', startStationId: 'a', endStationId: 'b', nextTripOperationListId: null },
            { id: 's2', operationId: 'op-02K', startStationId: 'b', endStationId: 'c', nextTripOperationListId: null },
        ];
        const dtos = buildDtos({ operationId: 'op-18K', tripOperationLists: original, nextTripOperationListId: null });
        expect(dtos[0].tripOperationLists).toEqual(original.map((o) => expect.objectContaining(o)));
    });
    it('新しい列車（区間なし）は今どおり id なしで 1 つ作る', () => {
        const dtos = buildDtos({ operationId: 'op-11K', tripOperationLists: [], nextTripOperationListId: null });
        expect(dtos[0].tripOperationLists).toEqual([expect.objectContaining({ operationId: 'op-11K' })]);
        expect(dtos[0].tripOperationLists[0].id).toBeUndefined();
    });
});
```

（`buildDtos` は、このファイルの既存のテストの組み方で 1 列車ぶんのフォーム値を作って変換する小さな関数をテスト内に書く）

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern timetable-edit-form-to-trip-dtos`
Expected: FAIL

- [ ] **Step 3: フォームに元の区間を持たせる**（`timetable-edit-form-trip-form.util.ts` の UPDATE 用の group と、新規用の group の両方）

```ts
            operationId: [
                {
                    value:
                        mode === ETimetableEditFormMode.UPDATE && trip.tripOperationLists?.length
                            ? trip.tripOperationLists[0].operationId
                            : '',
                    // 区間が 2 つ以上の列車は、ここでは運番を変えない（区間を潰さない）
                    disabled: mode === ETimetableEditFormMode.UPDATE && (trip.tripOperationLists?.length ?? 0) > 1,
                },
            ],
            /** 元の区間（表示しない）。保存で id とつながりを送り返すため */
            tripOperationLists: [mode === ETimetableEditFormMode.UPDATE ? (trip.tripOperationLists ?? []) : []],
            nextTripOperationListId: [
                mode === ETimetableEditFormMode.UPDATE && trip.tripOperationLists?.length === 1
                    ? (trip.tripOperationLists[0].nextTripOperationListId ?? null)
                    : null,
            ],
```

新規用の group には `tripOperationLists: [[]]`・`nextTripOperationListId: [null]` を足す。フォーム値を読むところが `getRawValue()` でなく `value` なら、無効にした `operationId` が落ちるので、変換側では `tripOperationLists` だけを見る（下）。

- [ ] **Step 4: 変換で送り返す**（`timetable-edit-form-to-trip-dtos.util.ts` の `tripOperationLists:` の式を置き換える）

```ts
                tripOperationLists: buildTripOperationLists(trip, times),
```

同じファイルに足す:

```ts
/**
 * 区間の送り返し。区間が 2 つ以上なら元のまま、1 つなら id とつながりを残して運番・駅を今の値にする。
 * id を落とすと API は区間を作り直し、つながり（次の区間）が消える
 */
function buildTripOperationLists(
    trip: { operationId?: string; tripOperationLists?: { id?: string; operationId: string; startStationId?: string; endStationId?: string; nextTripOperationListId?: string | null }[]; nextTripOperationListId?: string | null },
    times: { stationId: string }[],
) {
    const original = trip.tripOperationLists ?? [];
    if (original.length > 1) {
        return original.map((o) => ({
            id: o.id,
            operationId: o.operationId,
            startStationId: o.startStationId,
            endStationId: o.endStationId,
            nextTripOperationListId: o.nextTripOperationListId ?? null,
        }));
    }
    if (!trip.operationId) return [];
    return [
        {
            id: original[0]?.id,
            operationId: trip.operationId,
            startStationId: times[0]?.stationId ?? null,
            endStationId: times[times.length - 1]?.stationId ?? null,
            nextTripOperationListId: trip.nextTripOperationListId ?? null,
        },
    ];
}
```

（`times` は今の式で使っている変数をそのまま渡す。区間が 1 つで運番を空にした列車は、今どおり区間なしにする）

- [ ] **Step 5: 目撃の型に `sightedAsOperation` を足す**（4 ファイル。model 側は `@Expose()`）

```ts
    @Expose()
    sightedAsOperation?: { operationId: string; operationNumber: string } | null;
```

- [ ] **Step 6: テストを通す**

Run: `npx jest --testPathPattern timetable-edit-form`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/app/libs src/app/pages/timetable/timetable-edit-form
git commit -m "fix: :bug: 列車の保存で運用区間の id とつながりを送り返し、複数の区間を潰さない"
```

---

### Task 11: 編集画面で「次の区間」を選ぶ

**Files:**
- Modify: `src/app/libs/operation/infrastructure/queries/operation.query.ts`（候補の取得口を足す）・`src/app/libs/operation/usecase/operation.service.ts`
- Create: `src/app/libs/operation/usecase/dtos/next-segment-candidate.dto.ts`
- Modify: 運番の欄がある列車の入力部品（`grep -rln "operationId" src/app/pages/timetable/timetable-edit-form/components` で探す。`timetable-edit-form-trips` 配下のはず）
- Test: その部品の spec

**Interfaces:**
- Consumes: `GET /v3/operations/calendar/:calendarId/next-segment-candidates?stationId=&afterSeconds=`（API Task 6）
- Produces: `OperationService.findManyNextSegmentCandidates({ calendarId, stationId, afterSeconds }): Observable<NextSegmentCandidateDto[]>`

画面:
- 運番の欄の下に `mat-select`「次の区間（車両が運番を離れるときだけ）」を足す。区間が 1 つの列車だけに出す（新しい列車には出さない。指す側の区間がまだ無く、候補の時刻も決まらないため）
- 選択肢の先頭は「なし（同じ運番を続ける）」= `null`
- 候補は、終着駅・到着時刻を `afterSeconds` に換算して API から引く。表示は `{{ operationNumber }}　{{ 発時刻 HH:mm }}`。`isTaken` の候補は「（ほかの区間の次）」を添えて `disabled` にする（今の値と同じものは選べるままにする）
- 今の値が候補に無いとき（駅や時刻を直した等）は、今の値を「現在の設定」として先頭に残す（黙って外さない）

- [ ] **Step 1: 失敗するテストを書く**（部品の spec。`OperationService` をモックにする）

```ts
    it('区間が 1 つの列車に「次の区間」を出し、候補を時刻順に出す', async () => {
        operationService.findManyNextSegmentCandidates.mockReturnValue(of([
            { tripOperationListId: 'b', tripId: 't2', operationId: 'op-12K', operationNumber: '12K', startStationId: 'ebina', startSeconds: 30600, isTaken: false },
            { tripOperationListId: 'c', tripId: 't3', operationId: 'op-38G', operationNumber: '38G', startStationId: 'ebina', startSeconds: 31200, isTaken: true },
        ]));
        // 区間が 1 つの列車のフォームで部品を描く（既存 spec の組み方に合わせる）
        await openNextSegmentSelect();
        const options = getOptionTexts();
        expect(options).toEqual(['なし（同じ運番を続ける）', '12K　08:30', '38G　08:40（ほかの区間の次）']);
    });

    it('区間が 2 つ以上の列車には出さない', async () => {
        // tripOperationLists が 2 つのフォームで描く
        expect(queryNextSegmentSelect()).toBeNull();
    });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern timetable-edit-form-trips`
Expected: FAIL

- [ ] **Step 3: 取得口を足す**（`operation.query.ts` の既存の v3 の取得の書き方に合わせる）

```ts
    findManyNextSegmentCandidates(params: { calendarId: string; stationId: string; afterSeconds: number }): Observable<NextSegmentCandidateDto[]> {
        return this.#http.get<NextSegmentCandidateDto[]>(
            `${this.#v3BaseUrl}/calendar/${params.calendarId}/next-segment-candidates`,
            { params: { stationId: params.stationId, afterSeconds: String(params.afterSeconds) } },
        );
    }
```

（`#http`・`#v3BaseUrl` は今のファイルの名前に合わせる。service にも同名で素通しを足す）

- [ ] **Step 4: 部品に select を足す**（Material の `mat-form-field` ＋ `mat-select`。既存の運番の欄と同じ並び・幅）

```html
@if (tripOperationListCount() === 1) {
    <mat-form-field class="tw-w-full">
        <mat-label>次の区間（車両が運番を離れるときだけ）</mat-label>
        <mat-select formControlName="nextTripOperationListId">
            <mat-option [value]="null">なし（同じ運番を続ける）</mat-option>
            @if (currentNextIsMissing()) {
                <mat-option [value]="currentNext()">現在の設定</mat-option>
            }
            @for (c of nextSegmentCandidates(); track c.tripOperationListId) {
                <mat-option [value]="c.tripOperationListId" [disabled]="c.isTaken && c.tripOperationListId !== currentNext()">
                    {{ c.operationNumber }}　{{ c.startSeconds | secondsToHhmm }}{{ c.isTaken && c.tripOperationListId !== currentNext() ? '（ほかの区間の次）' : '' }}
                </mat-option>
            }
        </mat-select>
    </mat-form-field>
}
```

部品の ts に、フォームの `tripOperationLists` の長さ・終着駅・到着時刻から候補を引く signal を足す（`toSignal` で `OperationService.findManyNextSegmentCandidates` を呼ぶ。終着駅の到着時刻 `HH:mm` は `getHours() < 4` なら 2 日目として `(days - 1) * 86400 + h * 3600 + m * 60` に換算する。編集フォームの既存の 2 日目判定と同じ）。`secondsToHhmm` は小さなパイプとして `src/app/core/pipes/seconds-to-hhmm.pipe.ts` に作り、`86400` 以上は 24 を引いて `HH:mm` にする（spec を 2 件足す: 30600 → `08:30`、87000 → `00:10`）。

- [ ] **Step 5: テストを通す**

Run: `npx jest --testPathPattern "timetable-edit-form|seconds-to-hhmm"`
Expected: PASS

- [ ] **Step 6: 実物で確かめる**（`/timetable/update` で平日ダイヤの 6557 を開き、「次の区間」に 3808 の 12K が先頭近くに出ること。保存はしない＝本番に書くため。保存の確かめは保存テストの手順（渋谷工事臨時ダイヤ・2021 年 10 月版）にならい、試しの列車で行って後始末する）

- [ ] **Step 7: コミット**

```bash
git add src/app/libs/operation src/app/core/pipes src/app/pages/timetable/timetable-edit-form
git commit -m "feat: :sparkles: 列車情報の入力で次の区間を選べるようにする"
```

---

### Task 12: real-time に「（11Kとして目撃）」を出す

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-table/operation-real-time-formation-table.component.*`・`operation-real-time-operation-table/*`（帳票。同じ目撃を出している箇所があれば同じく）
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-legend/operation-real-time-legend.component.html`（凡例に 1 行）

**Interfaces:**
- Consumes: `OperationSightingTimeCrossSectionDto.sightedAsOperation`（Task 10）

- [ ] **Step 1: 失敗するテストを書く**（運用順カードの spec）

```ts
    it('引き継いだ目撃には「（11Kとして目撃）」を添える', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            latestSighting: { sightingTime: new Date(), operationSightingId: 's1' },
            expectedSighting: { formation: { formationId: 'f', formationNumber: '10701' } },
            sightedAsOperation: { operationId: 'op-11K', operationNumber: '11K' },
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('（11Kとして目撃）');
    });

    it('直接の目撃には何も添えない', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            latestSighting: { sightingTime: new Date(), operationSightingId: 's1' },
            expectedSighting: { formation: { formationId: 'f', formationNumber: '10701' } },
            sightedAsOperation: null,
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('として目撃');
    });
```

編成順カードの spec にも同じ 2 件（編成の側は `expectedSighting.operation` が 12K、`sightedAsOperation` が 11K）。

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern operation-real-time`
Expected: FAIL（2 件×2）

- [ ] **Step 3: 実装する**

運用順カードの ts:

```ts
    /** 引き継いだ目撃のときの元の運用番号（例: 12K のカードで 11K）。直接の目撃は null */
    readonly sightedAsOperationNumber = computed(
        () => this.timeCrossSection()?.sightedAsOperation?.operationNumber ?? null,
    );
```

html の `formationAnnotation()` の `@if` の直後（同じ横並びの中。入らなければ折り返す）:

```html
                @if (sightedAsOperationNumber(); as sightedAs) {
                    <span class="tw-whitespace-nowrap tw-text-xs tw-text-grey-600">
                        （{{ sightedAs }}として目撃）
                    </span>
                }
```

編成順カードも同じ computed を足し、運用番号を出している `@if (expectedSightingOperationVm)` の中、運用番号の直後に同じ span を置く。帳票の部品も、編成・運用を並べている同じ行の末尾に同じ span を置く。凡例に `<dt>（11Kとして目撃）</dt><dd class="tw-m-0">車両のつながりで引き継いだ目撃。目撃されたときの運用番号</dd>` を既存の並びの書き方で足す。

- [ ] **Step 4: テストを通す**

Run: `npx jest --testPathPattern operation-real-time`
Expected: PASS

- [ ] **Step 5: 実物で確かめる**（ローカル client → ローカル API → 本番 DB。Task 9 で入れた 6557 → 3808 のつながりで。今日 11K か 12K に目撃がある日に、両方のカードに同じ編成が出て、片方に「（11Kとして目撃）」が出ること。1024・1440・スマホ幅で、添え書きが編成番号の行で折り返し、カードの縦の中心がずれないことを実測する。スクリーンショットをユーザーに見せる）

- [ ] **Step 6: コミット**

```bash
git add src/app/pages/operation/operation-real-time
git commit -m "feat: :sparkles: リアルタイム運用情報で引き継いだ目撃に元の運用番号を添える"
```

---

### Task 13: 運用表・運用行路図に前後の運用を出す

**Files:**
- Create: `src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto.ts`
- Modify: `src/app/libs/operation/infrastructure/queries/operation.query.ts`・`src/app/libs/operation/usecase/operation.service.ts`
- Create: `src/app/pages/operation/operation-table/utils/build-itinerary-link-labels.util.ts`
- Test: `src/app/pages/operation/operation-table/utils/build-itinerary-link-labels.util.spec.ts`
- Modify: 運用表のストア（`pages/operation/operation-table/stores/*.store.ts`）・サービス・`operation-table.component.{ts,html}`・`components/operation-table-card/operation-table-card.component.{ts,html,spec.ts}`
- Modify: 運用行路図のストア・サービス・`operation-route-diagram.component.{ts,html}`

**Interfaces:**
- Consumes: `GET /v3/operations/calendar/:calendarId/itinerary-links`（API Task 6）
- Produces:

```ts
export interface ItineraryLinkLabels {
    /** 運用の頭: 「← 11K から」 */
    from: string | null;
    /** 運用の末尾: 「→ 12K へ」 */
    to: string | null;
    /** 列車の途中の切り替え（決まり 1）: tripId → 「赤羽岩淵から 18K へ」 */
    midTrip: Record<string, string>;
}
export function buildItineraryLinkLabels(params: {
    operationId: string;
    /** その運用の列車 id（時刻順） */
    tripIds: string[];
    links: OperationItineraryLinkDto[];
    stationNameById: (id: string) => string;
}): ItineraryLinkLabels;
```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { buildItineraryLinkLabels } from './build-itinerary-link-labels.util';

const names: Record<string, string> = { ebina: '海老名', ak: '赤羽岩淵' };
const end = (p: object) => ({ tripOperationListId: 'x', tripId: 'x', operationId: 'x', operationNumber: '', stationId: 'ebina', rule: 2, ...p });

describe('buildItineraryLinkLabels', () => {
    it('頭と末尾の前後の運用', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-12K',
            tripIds: ['t1', 't2'],
            links: [
                { tripOperationListId: 'a', tripId: 't1', operationId: 'op-12K', previous: end({ operationNumber: '11K' }), next: null },
                { tripOperationListId: 'b', tripId: 't2', operationId: 'op-12K', previous: null, next: end({ operationNumber: '13K' }) },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out).toEqual({ from: '← 11K から', to: '→ 13K へ', midTrip: {} });
    });

    it('列車の途中の切り替えは、その列車に「駅から 運番 へ」', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-02K',
            tripIds: ['B1818K'],
            links: [{ tripOperationListId: 'B02', tripId: 'B1818K', operationId: 'op-02K', previous: null, next: end({ operationNumber: '18K', stationId: 'ak', rule: 1 }) }],
            stationNameById: (id) => names[id],
        });
        expect(out.midTrip).toEqual({ B1818K: '赤羽岩淵から 18K へ' });
        expect(out.to).toBeNull();
    });

    it('ほかの運用のつながりは使わない', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-12K', tripIds: ['t1'],
            links: [{ tripOperationListId: 'z', tripId: 't9', operationId: 'op-99K', previous: end({ operationNumber: '11K' }), next: null }],
            stationNameById: (id) => names[id],
        });
        expect(out).toEqual({ from: null, to: null, midTrip: {} });
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern build-itinerary-link-labels`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';

export interface ItineraryLinkLabels {
    from: string | null;
    to: string | null;
    midTrip: Record<string, string>;
}

/**
 * 運用表・行路図の前後の運用の文言（spec 5.3）。
 * 頭の列車の前・末尾の列車の次は「← 11K から」「→ 12K へ」。列車の途中の切り替え（決まり 1）はその列車に。
 */
export function buildItineraryLinkLabels(params: {
    operationId: string;
    tripIds: string[];
    links: OperationItineraryLinkDto[];
    stationNameById: (id: string) => string;
}): ItineraryLinkLabels {
    const { operationId, tripIds, links, stationNameById } = params;
    const own = links.filter((o) => o.operationId === operationId);
    const first = tripIds[0];
    const last = tripIds[tripIds.length - 1];
    const midTrip: Record<string, string> = {};
    let from: string | null = null;
    let to: string | null = null;
    for (const link of own) {
        if (link.previous && link.tripId === first && link.previous.rule !== 1) {
            from = `← ${link.previous.operationNumber} から`;
        }
        if (link.next) {
            if (link.next.rule === 1) {
                midTrip[link.tripId] = `${stationNameById(link.next.stationId)}から ${link.next.operationNumber} へ`;
            } else if (link.tripId === last) {
                to = `→ ${link.next.operationNumber} へ`;
            }
        }
    }
    return { from, to, midTrip };
}
```

（DTO は API Task 6 の `OperationItineraryLinkDto`・`ItineraryLinkEndDto` と同じ形を client 側に写す。取得口は Task 11 と同じ書き方で `findManyItineraryLinks({ calendarId })` を足す。運用表の画面内キャッシュ（`QueryInvalidator` の仕組み）に載せ、列車の書き込み後に失効させる）

- [ ] **Step 4: テストを通す**

Run: `npx jest --testPathPattern build-itinerary-link-labels`
Expected: PASS

- [ ] **Step 5: 運用表のカードに出す**

ストアに `itineraryLinks: OperationItineraryLinkDto[]` を足し、運用の一覧（`/calendar/:calendarId/trips`）と同じタイミングで並べて取る（片方が失敗しても運用表は出す。つながりが取れなければ前後の運用を出さないだけ）。ストアは丸ごと保存の対象なので、足した項目もそのまま保存される（通信断のとき前回のつながりも出る）。

カードに `readonly links = input<OperationItineraryLinkDto[]>([]);` と、`buildItineraryLinkLabels` を呼ぶ computed `linkLabels` を足す（`tripIds` は `operationTrip().trips` の順、`stationNameById` は既存の `#stationNameById`）。html は折返し表の直前と直後に:

```html
    @if (linkLabels().from; as from) {
        <p class="tw-m-0 tw-px-4 tw-pt-2 tw-text-xs tw-text-grey-600">{{ from }}</p>
    }
    <!-- 折返し表 … -->
    @if (linkLabels().to; as to) {
        <p class="tw-m-0 tw-px-4 tw-pb-2 tw-text-right tw-text-xs tw-text-grey-600">{{ to }}</p>
    }
```

列車の行（`row.kind === 'trip'`）には、`linkLabels().midTrip[row.tripId]` があれば列車番号の行の下に同じ小さな字で出す（`row` の型に列車 id の項目が無ければ、`rows` の組み立てで足す）。カードの spec に、`from`・`to`・途中の文言が出ることを 3 件足す。

- [ ] **Step 6: 運用行路図に出す**

行路図のページも同じ取得口を使い、図の上（運用番号の見出しの並び）に `from`・`to` を、図の中の列車の途中の切り替えは、その列車の札の近くに文言で出す。図の描画（SVG）に手を入れるのが重いなら、まず見出しの並びに 3 種類とも文言で並べ、図の中への描き込みはユーザーに見せて決める（spec 5.3 は「運用表と同じでいい」）。

- [ ] **Step 7: テストを通す**

Run: `npx jest --testPathPattern "operation-table|operation-route-diagram"`
Expected: PASS

- [ ] **Step 8: 実物で確かめる**（6557 → 3808 のつながりで、11K のカードの末尾に「→ 12K へ」、12K のカードの頭に「← 11K から」。1024・1440・スマホ幅で、カードの幅を超えないこと（`scrollWidth` をカードごとに測る）。行路図も同じ。スクリーンショットをユーザーに見せ、置き場所と字の大きさを決めてもらう）

- [ ] **Step 9: コミット**

```bash
git add src/app/libs/operation src/app/pages/operation/operation-table src/app/pages/operation/operation-route-diagram
git commit -m "feat: :sparkles: 運用表と運用行路図に車両の前後の運用を出す"
```

---

### Task 14: 過去の運用情報に引き継いだ目撃を出す

**Files:**
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`・`usecase/operation-sighting.service.ts`（`findManyBySpecificPeriod` に `includeCarriedOver` を通す）
- Modify: `src/app/pages/operation/operation-past-time/services/operation-past-time.service.ts`（`fetchOperationSightingsV3` で `includeCarriedOver: true`）
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.{html,ts,spec.ts}`

**Interfaces:**
- Consumes: `GET /v3/operation-sightings/from/:start/to/:end?includeCarriedOver=true`（API Task 8）・`OperationSightingDetailsDto.sightedAsOperation`（Task 10）

- [ ] **Step 1: 失敗するテストを書く**（表の spec）

```ts
    it('引き継いだ目撃は運用番号のタグに「（11Kとして目撃）」を添える', () => {
        // 10701 の 10/12 のマスに、直接の 11K と、引き継いだ 12K（sightedAsOperation: 11K）を入れて描く
        const cell = getCell('f-10701', '2026-10-12');
        expect(cell.textContent).toContain('11K');
        expect(cell.textContent).toContain('12K');
        expect(cell.textContent).toContain('（11Kとして目撃）');
    });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern operation-past-time`
Expected: FAIL

- [ ] **Step 3: 実装する**

query に `includeCarriedOver?: boolean` を足し、true のときだけクエリに `includeCarriedOver=true` を付ける（`includeInvalidated` と同じ書き方）。表のタグを描く `@for` の中、タグの直後に:

```html
@if (sighting.sightedAsOperation; as sightedAs) {
    <span class="tw-text-xs tw-text-grey-600">（{{ sightedAs.operationNumber }}として目撃）</span>
}
```

`track` が目撃の id なら、引き継いだ目撃は `<元の id>#<運番>` なので重ならない（API Task 8）。マスの幅（8rem）で折り返したときの見え方は、実データのマスを clone して 2〜3 案（添え書きを全文・「11K→」の短縮・タグの色を薄くする）を横に並べ、ユーザーに選んでもらってから決める。

- [ ] **Step 4: テストを通す**

Run: `npx jest --testPathPattern operation-past-time`
Expected: PASS

- [ ] **Step 5: 実物で確かめる**（つながりを入れた日のマスで、直接と引き継いだタグが並ぶこと。無効化を含める切り替えを入れても、引き継いだ目撃が無効化された目撃から作られないこと）

- [ ] **Step 6: コミット**

```bash
git add src/app/libs/operation-sighting src/app/pages/operation/operation-past-time
git commit -m "feat: :sparkles: 過去の運用情報に行程表で引き継いだ目撃を出す"
```

---

### Task 15: client の仕上げ

- [ ] **Step 1: 全体のテスト・lint・ビルド**

Run: `npx jest`
Expected: PASS（結果の `Tests:` 行はファイルに出して読む）

Run: `npm run lint`（サンドボックス外）
Expected: 0 件

Run: `npm run build`
Expected: 成功

- [ ] **Step 2: ロック済みページの掟の確かめ**（real-time・運用表・運用行路図・過去の運用情報・列車情報の入力はロック済み。足したのは添え書きと選択欄だけで、既存の情報を削っていないこと・既存の並びの縦の中心がずれていないことを実測で確かめる）

- [ ] **Step 3: PR**。push はユーザーに `! git push` を頼み、`gh pr create`。マージとデプロイ（タグ push）はユーザーの指示を待つ。API が先にデプロイされていること

---

## この計画でやらないこと

- 海老名などの残りのつながり（今の平日ダイヤで約 11 組、土休日も）の入力。入力はデプロイ後に編集画面で行う（ユーザー）。入庫・出庫の印を外すかどうかは、その後のデータ修正（spec 3.6 の範囲外）
- 列車の途中で運番を分ける入力（決まり 1 の区間を画面で作る）。臨時ダイヤの計画で扱う
- ダッシュボードの「最新の目撃」。目撃の出来事の一覧なので引き継ぎを足さない（ダッシュボードの充当の表示が時刻断面を使っていれば、Task 7 で自動的に引き継がれる）。ユーザーの考えが違えば足す
- 日をまたぐ巡回（`operationNumberCirculateMap`）と行程表の合わせ技。今日の目撃が無い運番は今の判定のまま
