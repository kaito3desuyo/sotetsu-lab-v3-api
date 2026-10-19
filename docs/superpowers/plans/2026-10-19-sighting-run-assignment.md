# 目撃の枠割り当て Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** real-time（運用カード・編成カード）と過去の運用情報の「推測」を、枠ごとの割り当てという 1 つの規則で決め、推測は「?」で示す。

**Architecture:** API の `SightingCarryOver`（read-model）に、1 鉄道日ぶんの目撃から「枠 → 編成（実目撃 / 推測）」を作る割り当て（`RunAssignments`）を 1 か所で作る。`resolveForOperation`・`resolveForFormation`・`buildCarried` はその割り当てを引くだけにする。client は `sightedAsOperation` があれば「?」を付け、@ と斜線を消す。

**Tech Stack:** NestJS 10 / TypeScript / Jest（API）、Angular 22 / Jest（client）

**Spec:** `docs/superpowers/specs/2026-10-19-sighting-run-assignment-design.md`

## Global Constraints

- ブランチは API・client とも `fix/carry-return-operation`。新しいブランチは切らない
- 目撃を枠に結び付ける順は「受け持ち中（[start, end)）→ 次に始まる → 直前に終わった」。検索時刻から今の区間を選ぶ `segmentOfOperationAt` / `itineraryOfOperationAt` / `VehicleItinerary.segmentAt` は変えない
- 戻り値の約束: 割り当て＝オブジェクト、`null`＝不明、`'unsighted'`＝行程に今日の実目撃が無い（運用カードのみ）、`undefined`＝行程表で判定できない
- `sightedAsOperation`: 推測なら推測の元の目撃の運番（同じ番号でも入れる）、実目撃なら `null`
- 推測は 1 鉄道日（4:00 区切り）の中だけ
- 整形は元から prettier 済みのファイルだけ。`operation-sighting.v3.service.ts` と `operation-sighting.v3.service.spec.ts`（API）、`operation-past-time-table.component.html` と `.spec.ts`・`operation-number-tag.component.html`（client）は未整形なので prettier をかけない
- コード中に利用者の名前を書かない。コメントは日本語で既存の密度に合わせる
- コミットは Conventional Commits＋絵文字、ドメイン名は日本語。署名付きコミットはサンドボックスの外で行う
- 完了の条件: API `npx jest`・`npx tsc --noEmit -p tsconfig.json`・変更ディレクトリの `npx eslint`、client `npx jest`・変更ディレクトリの `npx eslint`（サンドボックス外）がすべて通る

## Review Focus

- 同じ枠に 2 つの編成の実目撃（入力の食い違い）: 運用カードは新しいほう、推測の候補には両方が残る → Task 2 のテスト「同じ枠に 2 編成」
- 推測の元が「同じ番号の別の枠」（X1:A だけで X2 を A? にする場合）: `sightedAsOperation` は X（同じ番号）が入り、client は「?」を出す。戻り①（X1:A、Y:B）の X2 は B の Y から推すので Y が入る → Task 2 のテスト「戻り①: X2 の推測の元は 17K」「戻り（X1:A だけ）」
- 検索時刻より後の目撃（real-time）: 割り当てに使わない → Task 2 のテスト「検索時刻より後の目撃は使わない」
- 一括取得で運番ごとに呼ばれる: 同じ行程表・同じ目撃配列・同じ検索時刻なら割り当てを作り直さない → Task 2 のテスト「割り当ての使い回し」
- 行程に今日の実目撃が無い運番に、別の行程の今日の目撃がある（朝の 02K と夕方の 02K）: 不明 → Task 3 のテスト

---

### Task 1: 行程の枠と、目撃用の区間の選び方

**Files:**
- Modify: `src/libs/operation/usecase/read-models/vehicle-itinerary.read-model.ts`
- Test: `src/libs/operation/usecase/read-models/vehicle-itinerary.read-model.spec.ts`

**Interfaces:**
- Produces:
  - `VehicleItinerary.runs(): ItinerarySegment[][]`（同じ配列を返す。枠の同一性を `===` で比べられる）
  - `VehicleItinerary.runOf(segment: ItinerarySegment): ItinerarySegment[] | undefined`
  - `VehicleItineraryReadModel.segmentOfSightingAt(operationNumber: string, seconds: number): ItinerarySegment | null`

- [ ] **Step 1: 失敗するテストを書く**

`vehicle-itinerary.read-model.spec.ts` の末尾に足す（`seg`・`t` は既存のヘルパーを使う。無ければ sighting-carry-over の spec と同じ形で定義する）。

```ts
describe('VehicleItineraryReadModel.segmentOfSightingAt', () => {
    // 18K（5:08〜8:52）→ 17K（9:00〜17:02）→ 18K（17:09〜21:22）
    const model = VehicleItineraryReadModel.create([
        seg({ id: 'm18', operationNumber: '18K', startSeconds: t('05:08'), endSeconds: t('08:52'), nextTripOperationListId: 'd17' }),
        seg({ id: 'd17', operationNumber: '17K', startSeconds: t('09:00'), endSeconds: t('17:02'), nextTripOperationListId: 'e18' }),
        seg({ id: 'e18', operationNumber: '18K', startSeconds: t('17:09'), endSeconds: t('21:22') }),
    ]);
    it('受け持ち中の区間を選ぶ', () => {
        expect(model.segmentOfSightingAt('18K', t('06:00'))?.id).toBe('m18');
    });
    it('受け持ち中が無ければ次に始まる区間を選ぶ（先回りの入力）', () => {
        expect(model.segmentOfSightingAt('18K', t('16:23'))?.id).toBe('e18');
    });
    it('次も無ければ直前に終わった区間を選ぶ', () => {
        expect(model.segmentOfSightingAt('18K', t('22:00'))?.id).toBe('e18');
    });
    it('始まる前なら最初の区間（次に始まる）', () => {
        expect(model.segmentOfSightingAt('18K', t('04:30'))?.id).toBe('m18');
    });
    it('その運番の区間が無ければ null', () => {
        expect(model.segmentOfSightingAt('99X', t('06:00'))).toBeNull();
    });
    it('検索時刻の選び方は変えない（16:23 の 18K は朝の区間）', () => {
        expect(model.segmentOfOperationAt('18K', t('16:23'))?.id).toBe('m18');
    });
    it('枠は同じ配列を返し、区間から枠を引ける', () => {
        const itinerary = model.itineraryOf('d17')!;
        expect(itinerary.runs()).toBe(itinerary.runs());
        expect(itinerary.runs().map((r) => r.map((s) => s.id))).toEqual([['m18'], ['d17'], ['e18']]);
        expect(itinerary.runOf(itinerary.segments[2])).toBe(itinerary.runs()[2]);
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/libs/operation/usecase/read-models/vehicle-itinerary.read-model.spec.ts`
Expected: FAIL（`segmentOfSightingAt` / `runOf` が無い、`runs()` が毎回別の配列）

- [ ] **Step 3: 実装する**

`VehicleItinerary` の `runs()` を、コンストラクタで 1 回だけ作った配列を返す形に替え、`runOf` を足す。

```ts
    private readonly runList: ItinerarySegment[][];

    private constructor(private readonly chain: ItinerarySegment[]) {
        this.timeOrdered = [...chain].sort(compareSegmentsByTime);
        this.runList = [];
        for (const s of chain) {
            const last = this.runList[this.runList.length - 1];
            if (last && last[0].operationNumber === s.operationNumber) last.push(s);
            else this.runList.push([s]);
        }
    }

    /** 運番が切り替わるまとまり（つながり順）。18K → 17K → 18K と戻る行程なら 3 つ。同じ配列を返す */
    runs(): ItinerarySegment[][] {
        return this.runList;
    }

    /** 区間が入っている枠 */
    runOf(segment: ItinerarySegment): ItinerarySegment[] | undefined {
        return this.runList.find((r) => r.includes(segment));
    }
```

`pickAt` の下に目撃用の選び方を足し、`VehicleItineraryReadModel` に口を足す。

```ts
/**
 * 目撃を結び付ける区間。受け持ち中 → 次に始まる → 直前に終わった（時刻順の配列から選ぶ）。
 * 先回りの入力（X を走っている最中に、次に受け持つ Y と入れる）を次の Y に付けるため、検索時刻用の pickAt と順を替える
 */
function pickForSighting(
    sorted: ItinerarySegment[],
    seconds: number,
): ItinerarySegment | null {
    if (!sorted.length) return null;
    const active = sorted.find(
        (s) => s.startSeconds <= seconds && seconds < s.endSeconds,
    );
    if (active) return active;
    const upcoming = sorted.find((s) => s.startSeconds > seconds);
    if (upcoming) return upcoming;
    return sorted[sorted.length - 1];
}
```

```ts
    /** 目撃（その時刻にその運番と入力された）を結び付ける区間 */
    segmentOfSightingAt(
        operationNumber: string,
        seconds: number,
    ): ItinerarySegment | null {
        return pickForSighting(
            this.byOperation.get(operationNumber) ?? [],
            seconds,
        );
    }
```

（`byOperation` の配列は `compareSegmentsByTime` で並んでいるので、「直前に終わった」は最後の要素でよい。終わった区間しか無いときに来るため）

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/libs/operation/usecase/read-models`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/libs/operation/usecase/read-models/vehicle-itinerary.read-model.ts src/libs/operation/usecase/read-models/vehicle-itinerary.read-model.spec.ts
git add src/libs/operation/usecase/read-models
git commit -m "feat: :sparkles: 運用の行程に、目撃を結び付ける区間の選び方（受け持ち中・次・直前）と枠の引き方を足す"
```

---

### Task 2: 枠の割り当てで real-time と過去の運用を判定する

**Files:**
- Modify: `src/libs/operation-sighting/usecase/read-models/sighting-carry-over.read-model.ts`
- Test: `src/libs/operation-sighting/usecase/read-models/sighting-carry-over.read-model.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `runs()`・`runOf()`・`segmentOfSightingAt()`
- Produces:
  - `SightingCarryOver.create(itineraries)` は同じ行程表なら同じインスタンスを返す
  - `resolveForOperation(...)`: `{ sighting: S; sightedAsOperation: SightedAsOperation | null } | null | 'unsighted' | undefined`
  - `resolveForFormation(...)`: `{ sighting: S; operationNumber: string; sightedAsOperation: SightedAsOperation | null } | null | undefined`（形は今と同じ）
  - `buildCarried(...)`・`positionOf(...)`・`itineraryOfSighting(...)`: 形は今と同じ

- [ ] **Step 1: 失敗するテストを書く（4 章の表）**

spec の既存フィクスチャ（`ebina`・`akabane`・`back18`・`swap`・`sighting`・`at`・`t`）を使い、`describe('SightingCarryOver（枠の割り当て・spec 4 章）')` を足す。`back18` を X=18K / Y=17K とみなす。時刻は X1 05:08〜08:52、Y 09:00〜17:02、X2 17:09〜21:22。

```ts
describe('SightingCarryOver（枠の割り当て・spec 4 章）', () => {
    const op = (sightings: OperationSightingDetailsDto[], operationNumber: string, hhmm: string) =>
        SightingCarryOver.create(back18).resolveForOperation({ sightings, operationNumber, searchTime: at(hhmm) });
    const fm = (sightings: OperationSightingDetailsDto[], formationNumber: string, hhmm: string) =>
        SightingCarryOver.create(back18).resolveForFormation({ sightings, formationNumber, searchTime: at(hhmm) });
    const past = (sightings: OperationSightingDetailsDto[]) =>
        SightingCarryOver.create(back18).buildCarried({ sightings, operations: operationsBack }).map((o) => [o.formation?.formationNumber, o.operation?.operationNumber]);
    const who = (r: ReturnType<typeof op>) =>
        r && typeof r === 'object' ? `${r.sighting.formation?.formationNumber}${r.sightedAsOperation ? '?' : ''}` : r;
    const fmWho = (r: ReturnType<typeof fm>) =>
        r ? `${r.operationNumber}${r.sightedAsOperation ? '?' : ''}` : r;

    it('切替①（X:A）: Y は A?。編成カードは Y の間 17K?', () => {
        const s = [sighting('a', '18K', 'A', '06:00')];
        expect(who(op(s, '17K', '10:00'))).toBe('A?');
        expect(fmWho(fm(s, 'A', '10:00'))).toBe('17K?');
        expect(past(s)).toEqual([['A', '17K'], ['A', '18K']]);
    });
    it('切替②（Y:A）: X は Y の目撃後に A?、Y の目撃前は unsighted', () => {
        const s = [sighting('a', '17K', 'A', '10:00')];
        expect(who(op(s, '18K', '08:00'))).toBe('unsighted');
        expect(who(op(s, '18K', '10:30'))).toBe('A?');
    });
    it('切替②: X の間に Y と先回りで入れたら、編成カードは X の間 18K?', () => {
        const s = [sighting('a', '17K', 'A', '08:40')];
        expect(fmWho(fm(s, 'A', '08:45'))).toBe('18K?');
        expect(fmWho(fm(s, 'A', '09:30'))).toBe('17K');
    });
    it('切替③（X:A、Y:B）: 運用カードは X:A・Y:B、A は Y が始まったら不明', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('b', '17K', 'B', '10:00')];
        expect(who(op(s, '18K', '10:30'))).toBe('A');
        expect(who(op(s, '17K', '10:30'))).toBe('B');
        expect(fmWho(fm(s, 'A', '08:00'))).toBe('18K');
        expect(fm(s, 'A', '10:30')).toBeNull();
        expect(fmWho(fm(s, 'B', '10:30'))).toBe('17K');
    });
    it('戻り①（X1:A、Y:B）: X は X1・Y の間 A、X2 の間 B?。B は X2 の間 18K?', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('b', '17K', 'B', '10:00')];
        expect(who(op(s, '18K', '12:00'))).toBe('A');
        expect(who(op(s, '18K', '18:00'))).toBe('B?');
        expect(fm(s, 'A', '18:00')).toBeNull();
        expect(fmWho(fm(s, 'B', '18:00'))).toBe('18K?');
        expect(past(s)).toEqual([['B', '18K']]);
    });
    it('戻り①: X2 の推測の元は 17K（sightedAsOperation は元の目撃の運番）', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('b', '17K', 'B', '10:00')];
        const r = op(s, '18K', '18:00');
        expect(r && typeof r === 'object' && r.sightedAsOperation?.operationNumber).toBe('17K');
    });
    it('戻り②（X1:A、X2:B）: Y は A?、A は X2 が始まったら不明', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('b', '18K', 'B', '17:30')];
        expect(who(op(s, '17K', '18:00'))).toBe('A?');
        expect(who(op(s, '18K', '18:00'))).toBe('B');
        expect(fmWho(fm(s, 'A', '12:00'))).toBe('17K?');
        expect(fm(s, 'A', '18:00')).toBeNull();
        expect(past(s)).toEqual([['A', '17K']]);
    });
    it('戻り（X1:A だけ）: Y も X2 も A?。X2 の推測の元は 18K', () => {
        const s = [sighting('a', '18K', 'A', '05:09')];
        expect(who(op(s, '18K', '18:00'))).toBe('A?');
        expect(past(s)).toEqual([['A', '17K'], ['A', '18K']]);
    });
    it('移動: 朝 81、昼 87 の行程の目撃より前の 77 は付けない', () => {
        const s = [sighting('a', '81', '114', '08:31'), sighting('b', '87', '114', '18:12')];
        expect(SightingCarryOver.create(swap).buildCarried({ sightings: s, operations: operationsSwap })).toEqual([]);
    });
    it('休車: 朝 X、昼 100 なら、昼をまたぐ Y は付けない（ほかに候補が無ければ不明）', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('x', '100', 'A', '12:00')];
        expect(op(s, '17K', '13:00')).toBeNull();
        expect(fm(s, 'A', '13:00')).toBeUndefined();
    });
    it('先回り: 16:23 の 18K は X2 の実目撃。X1 は A?', () => {
        const s = [sighting('a', '17K', 'A', '16:23'), sighting('b', '18K', 'A', '16:23')];
        expect(past(s)).toEqual([['A', '18K']]);
        const carried = SightingCarryOver.create(back18).buildCarried({ sightings: s, operations: operationsBack });
        expect(carried[0].id).toBe('b#18K');
    });
    it('10/05 の 3105・5181: 3105 に夕方の 18K の推測を作らない', () => {
        const s = [
            sighting('p', '18K', '5181', '08:12'),
            sighting('q', '17K', '5181', '08:34'),
            sighting('r', '17K', '3105', '16:23'),
            sighting('u', '18K', '3105', '16:24'),
        ];
        expect(past(s)).toEqual([]);
    });
    it('別車両の同番: 17:50 の 02K は夕方の車両。18:20 の 02K、18:40 の 18K に出る', () => {
        const s = [sighting('a', '02K', 'A', '17:50')];
        const carry = SightingCarryOver.create(akabane);
        expect(carry.itineraryOfSighting(s[0])).toBe(akabane.itineraryOf('B02'));
        const r1 = carry.resolveForOperation({ sightings: s, operationNumber: '02K', searchTime: at('18:20') });
        expect(r1 && typeof r1 === 'object' && r1.sighting.id).toBe('a');
        const r2 = carry.resolveForOperation({ sightings: s, operationNumber: '18K', searchTime: at('18:40') });
        expect(r2 && typeof r2 === 'object' && r2.sightedAsOperation?.operationNumber).toBe('02K');
    });
    it('検索時刻の選び方は変えない: 06:30 の 02K の編成は、12:00 の 02K に出る', () => {
        const s = [sighting('a', '02K', 'A', '06:30')];
        const r = SightingCarryOver.create(akabane).resolveForOperation({ sightings: s, operationNumber: '02K', searchTime: at('12:00') });
        expect(r && typeof r === 'object' && r.sighting.id).toBe('a');
    });
    it('同じ枠に 2 編成: 運用カードは新しいほう、推測は新しいほうから続く', () => {
        const s = [sighting('a', '18K', 'A', '05:30'), sighting('b', '18K', 'B', '06:30')];
        expect(who(op(s, '18K', '07:00'))).toBe('B');
        expect(who(op(s, '17K', '10:00'))).toBe('B?');
    });
    it('検索時刻より後の目撃は使わない', () => {
        const s = [sighting('a', '18K', 'A', '06:00'), sighting('b', '17K', 'B', '10:00')];
        expect(who(op(s, '17K', '09:30'))).toBe('A?');
    });
    it('割り当ての使い回し: 同じ行程表なら同じインスタンス', () => {
        expect(SightingCarryOver.create(back18)).toBe(SightingCarryOver.create(back18));
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/libs/operation-sighting/usecase/read-models/sighting-carry-over`
Expected: FAIL（`'unsighted'` が返らない、切替③の運用カード X が B になる、先回りが X1 に付く など）

- [ ] **Step 3: 実装する**

`sighting-carry-over.read-model.ts` を次の形にする（`secondsOf`・`usable`・`CarrySighting`・`SightedAsOperation` は今のものを使う。今の `sightedAs`・`preferDirect`・`runOfSighting` は消す）。

```ts
/** 推測した割り当てに添える、推測の元の目撃の運番 */
const sourceOf = (s: CarrySighting): SightedAsOperation | null =>
    s.operation
        ? { operationId: s.operationId, operationNumber: s.operation.operationNumber }
        : null;

const runStartOf = (run: ItinerarySegment[]) => Math.min(...run.map((r) => r.startSeconds));
const runEndOf = (run: ItinerarySegment[]) => Math.max(...run.map((r) => r.endSeconds));

/** 枠 1 つへの割り当て（spec 3.2） */
export type RunAssignment<S extends CarrySighting> = {
    /** 実目撃ならその枠の一番新しい実目撃、推測なら同じ行程でのその編成の一番新しい実目撃 */
    sighting: S;
    formationNumber: string;
    inferred: boolean;
};

/** 1 鉄道日ぶん（real-time は検索時刻まで）の目撃から作った、枠ごとの割り当て */
class RunAssignments<S extends CarrySighting> {
    constructor(
        private readonly byRun: Map<ItinerarySegment[], RunAssignment<S>>,
        private readonly sighted: Set<VehicleItinerary>,
    ) {}

    of(run: ItinerarySegment[]): RunAssignment<S> | undefined {
        return this.byRun.get(run);
    }

    /** その行程に実目撃があるか */
    hasSightingIn(itinerary: VehicleItinerary): boolean {
        return this.sighted.has(itinerary);
    }

    entries(): [ItinerarySegment[], RunAssignment<S>][] {
        return [...this.byRun.entries()];
    }
}
```

`SightingCarryOver` の本体:

```ts
export class SightingCarryOver {
    /** 一括取得で運番ごとに呼ばれても、同じ行程表なら同じインスタンス（割り当てを使い回す） */
    private static readonly instances = new WeakMap<VehicleItineraryReadModel, SightingCarryOver>();

    /** 目撃の配列 → 検索時刻（ms。過去の運用は -1）→ 割り当て */
    private readonly assignmentCache = new WeakMap<object, Map<number, RunAssignments<CarrySighting>>>();

    /** buildCarried が作った目撃 → その枠の始まり（鉄道日の 0 時からの秒） */
    private readonly carriedPositions = new WeakMap<object, number>();

    private constructor(private readonly itineraries: VehicleItineraryReadModel) {}

    static create(itineraries: VehicleItineraryReadModel): SightingCarryOver {
        let carry = SightingCarryOver.instances.get(itineraries);
        if (!carry) {
            carry = new SightingCarryOver(itineraries);
            SightingCarryOver.instances.set(itineraries, carry);
        }
        return carry;
    }

    /** 目撃 → 結び付く行程と枠（受け持ち中 → 次 → 直前）。運番が無い・時刻表に無い運番なら undefined */
    private placementOf(s: CarrySighting): { itinerary: VehicleItinerary; run: ItinerarySegment[] } | undefined {
        const number = s.operation?.operationNumber;
        if (!number) return undefined;
        const segment = this.itineraries.segmentOfSightingAt(number, secondsOf(s.sightingTime));
        if (!segment) return undefined;
        const itinerary = this.itineraries.itineraryOf(segment.id);
        const run = itinerary?.runOf(segment);
        return itinerary && run ? { itinerary, run } : undefined;
    }

    /** 目撃 → その行程 */
    itineraryOfSighting(s: CarrySighting): VehicleItinerary | undefined {
        return this.placementOf(s)?.itinerary;
    }

    /** 枠の割り当て（spec 3.2）。searchTime を渡せばそれまでの目撃だけを使う */
    private assignmentsOf<S extends CarrySighting>(sightings: S[], searchTime?: dayjs.Dayjs): RunAssignments<S> {
        const key = searchTime ? searchTime.valueOf() : -1;
        let byTime = this.assignmentCache.get(sightings);
        if (!byTime) {
            byTime = new Map();
            this.assignmentCache.set(sightings, byTime);
        }
        const cached = byTime.get(key);
        if (cached) return cached as RunAssignments<S>;
        const built = this.buildAssignments(searchTime ? usable(sightings, searchTime) : sightings);
        byTime.set(key, built as RunAssignments<CarrySighting>);
        return built;
    }

    private buildAssignments<S extends CarrySighting>(sightings: S[]): RunAssignments<S> {
        const placed = sightings.flatMap((s) => {
            const formationNumber = s.formation?.formationNumber;
            return formationNumber
                ? [{ s, formationNumber, seconds: secondsOf(s.sightingTime), at: this.placementOf(s) }]
                : [];
        });
        const byRun = new Map<ItinerarySegment[], RunAssignment<S>>();
        const sighted = new Set<VehicleItinerary>();
        // 1. 実目撃（同じ枠に複数の編成なら一番新しい目撃）
        for (const p of placed) {
            if (!p.at) continue;
            sighted.add(p.at.itinerary);
            const current = byRun.get(p.at.run);
            if (!current || p.seconds >= secondsOf(current.sighting.sightingTime))
                byRun.set(p.at.run, { sighting: p.s, formationNumber: p.formationNumber, inferred: false });
        }
        const direct = new Set(byRun.keys());
        // 2〜4. 推測
        for (const itinerary of sighted) {
            const inItinerary = placed.filter((p) => p.at?.itinerary === itinerary);
            const formations = [...new Set(inItinerary.map((p) => p.formationNumber))];
            for (const run of itinerary.runs()) {
                if (direct.has(run)) continue;
                const start = runStartOf(run);
                const end = runEndOf(run);
                let best: { formationNumber: string; seconds: number; before: boolean } | undefined;
                for (const formationNumber of formations) {
                    const own = inItinerary.filter((p) => p.formationNumber === formationNumber);
                    const before = own.filter((p) => p.seconds <= start);
                    const source = before.length
                        ? before.reduce((a, b) => (b.seconds > a.seconds ? b : a))
                        : own.reduce((a, b) => (b.seconds < a.seconds ? b : a));
                    const from = Math.min(source.seconds, start);
                    const to = Math.max(source.seconds, end);
                    // 枠と元の目撃の間に、別の行程・枠の無い運番（休車 100 など）で目撃されていれば外す
                    const away = placed.some(
                        (o) => o.formationNumber === formationNumber && o.at?.itinerary !== itinerary && from <= o.seconds && o.seconds <= to,
                    );
                    if (away) continue;
                    const candidate = { formationNumber, seconds: source.seconds, before: source.seconds <= start };
                    // 前から続く側（枠の始まりまでで一番遅い）→ 無ければ一番早い
                    const better = !best
                        || (candidate.before !== best.before ? candidate.before
                            : candidate.before ? candidate.seconds > best.seconds : candidate.seconds < best.seconds);
                    if (better) best = candidate;
                }
                if (!best) continue;
                const latest = inItinerary
                    .filter((p) => p.formationNumber === best!.formationNumber)
                    .reduce((a, b) => (b.seconds >= a.seconds ? b : a));
                byRun.set(run, { sighting: latest.s, formationNumber: best.formationNumber, inferred: true });
            }
        }
        return new RunAssignments(byRun, sighted);
    }

    /**
     * real-time の運用カード（spec 3.3）。その運番の今の枠（受け持ち中 → 直前に終わった → 最初）の割り当て。
     * null は不明、'unsighted' は行程に今日の実目撃が無い、undefined は行程表で判定できない
     */
    resolveForOperation<S extends CarrySighting>(params: {
        sightings: S[];
        operationNumber: string;
        searchTime: dayjs.Dayjs;
    }): { sighting: S; sightedAsOperation: SightedAsOperation | null } | null | 'unsighted' | undefined {
        const { operationNumber, searchTime } = params;
        const segment = this.itineraries.segmentOfOperationAt(operationNumber, secondsOf(searchTime.toDate()));
        if (!segment) return undefined;
        const itinerary = this.itineraries.itineraryOf(segment.id);
        const run = itinerary?.runOf(segment);
        if (!itinerary || !run) return undefined;
        const assignments = this.assignmentsOf(params.sightings, searchTime);
        const assigned = assignments.of(run);
        if (assigned)
            return { sighting: assigned.sighting, sightedAsOperation: assigned.inferred ? sourceOf(assigned.sighting) : null };
        return assignments.hasSightingIn(itinerary) ? null : 'unsighted';
    }

    /**
     * real-time の編成カード（spec 3.4）。その編成の一番新しい目撃の行程の、今の枠の割り当て。
     * ほかの編成に割り当てられていれば null（不明）。一番新しい目撃が枠に結び付かなければ undefined（今の判定へ）
     */
    resolveForFormation<S extends CarrySighting>(params: {
        sightings: S[];
        formationNumber: string;
        searchTime: dayjs.Dayjs;
    }): { sighting: S; operationNumber: string; sightedAsOperation: SightedAsOperation | null } | null | undefined {
        const { formationNumber, searchTime } = params;
        const own = usable(params.sightings, searchTime).find((s) => s.formation?.formationNumber === formationNumber);
        if (!own) return undefined;
        const at = this.placementOf(own);
        if (!at) return undefined;
        const segment = at.itinerary.segmentAt(secondsOf(searchTime.toDate()));
        const run = segment ? at.itinerary.runOf(segment) : undefined;
        if (!run) return undefined;
        const assigned = this.assignmentsOf(params.sightings, searchTime).of(run);
        if (!assigned || assigned.formationNumber !== formationNumber) return null;
        return {
            sighting: assigned.sighting,
            operationNumber: run[0].operationNumber,
            sightedAsOperation: assigned.inferred ? sourceOf(assigned.sighting) : null,
        };
    }

    /**
     * 過去の運用情報（spec 3.5）。推測した枠ごとに、推測の元の目撃を写した「引き継いだ目撃」を作る。
     * id は `元の id#運番`、同じ行程に同じ運番の枠が 2 つ目以降なら `元の id#運番#2`
     */
    buildCarried<S extends CarrySighting, O extends { operationId: string; operationNumber: string }>(params: {
        sightings: S[];
        operations: O[];
    }): S[] {
        const out: S[] = [];
        const assignments = this.assignmentsOf(params.sightings);
        for (const itinerary of this.itineraries.all()) {
            const seen = new Map<string, number>();
            for (const run of itinerary.runs()) {
                const number = run[0].operationNumber;
                const nth = (seen.get(number) ?? 0) + 1;
                seen.set(number, nth);
                const assigned = assignments.of(run);
                if (!assigned?.inferred) continue;
                const operation = params.operations.find((o) => o.operationNumber === number);
                if (!operation) continue;
                const suffix = nth === 1 ? `#${number}` : `#${number}#${nth}`;
                const s = assigned.sighting;
                const carried = {
                    ...s,
                    id: `${s.id}${suffix}`,
                    operationSightingId: `${s.operationSightingId}${suffix}`,
                    operationId: operation.operationId,
                    operation,
                    sightedAsOperation: sourceOf(s),
                } as S;
                this.carriedPositions.set(carried, runStartOf(run));
                out.push(carried);
            }
        }
        return out;
    }

    /** 過去の運用情報で並べる位置（鉄道日の 0 時からの秒）。枠の始まり、行程表で引けなければ目撃の時刻 */
    positionOf(s: CarrySighting, operationNumber: string): number {
        const carried = this.carriedPositions.get(s);
        if (carried !== undefined) return carried;
        const segment = this.itineraries.segmentOfSightingAt(operationNumber, secondsOf(s.sightingTime));
        const run = segment ? this.itineraries.itineraryOf(segment.id)?.runOf(segment) : undefined;
        return run ? runStartOf(run) : secondsOf(s.sightingTime);
    }
}
```

ファイル冒頭のコメントを spec 3 章の要約に書き換える（「目撃の引き継ぎ」→「目撃の枠割り当て」。戻り値の約束を Global Constraints のとおり書く）。

- [ ] **Step 4: 既存テストを回し、落ちたものを 1 件ずつ仕分ける**

Run: `npx jest src/libs/operation-sighting/usecase/read-models/sighting-carry-over`

予想される既存テストの変化（spec の規則による意図した変更。期待値を書き換え、テスト名も合わせる）:

| 既存テスト | 今の期待 | 新しい期待 | 理由 |
|---|---|---|---|
| resolveForOperation「朝の 02K の目撃は…18:32 以降の 02K には出ない」の後半 | `null` | `'unsighted'` | 夕方の 02K の行程に今日の実目撃が無い |
| 「引き継いだ先でもっと新しい直接の目撃があればそちらが勝つ」 | `s2` | `s1` | 切替③。運用カードの X は X の実目撃（A） |
| 「検索時刻より後の目撃は使わない」 | `null` | `'unsighted'` | 使える目撃が無い |
| 境界「目撃が無ければ null」 | `null` | `'unsighted'` | 同上（テスト名も「unsighted」に） |
| 境界「別の行程表の目撃だけなら null」 | `null` | `'unsighted'` | 同上 |

これ以外が落ちたら、spec 4 章のどの行に当たるかを確かめ、当たらなければ実装の誤りとして直す。黙って期待値を変えない。

- [ ] **Step 5: 全部通ることを確かめる**

Run: `npx jest src/libs/operation-sighting src/libs/operation`
Expected: PASS（service の spec が `'unsighted'` で落ちる場合は Task 3 で直すので、ここでは read-model の spec だけ通ればよい）

- [ ] **Step 6: コミット**

```bash
npx prettier --write src/libs/operation-sighting/usecase/read-models/sighting-carry-over.read-model.ts src/libs/operation-sighting/usecase/read-models/sighting-carry-over.read-model.spec.ts
git add src/libs/operation-sighting/usecase/read-models
git commit -m "fix: :bug: 目撃情報の推測を枠ごとの割り当てで決め、real-time と過去の運用で同じ規則にする"
```

---

### Task 3: 時刻断面の判定で 'unsighted' と不明を分ける

**Files:**
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（`#timeCrossSectionByOperationNumber`）
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 の `resolveForOperation` の戻り値（`null` / `'unsighted'` / `undefined`）

- [ ] **Step 1: 失敗するテストを書く**

`describe('OperationSightingV3Service - findManyBySpecificPeriod includeCarriedOver'` と同じ組み立て方で、時刻断面（運番）の describe に 2 件足す。既存の時刻断面テストの `beforeEach`（`mockCalendarQuery`・`mockItinerarySegmentQuery`・`mockOperationSightingQuery.findManyValidBySightingTimeRange`・`findOneLatestByOperationNumberAndBeforeSightingTime`）に合わせる。

- 行程に今日の実目撃がある（11K→12K の行程で 10702 が 06:10 に 11K、06:30 に別の行程の 02K）→ 12K の 09:00 の断面は `expectedSighting: null`。その運番の最新目撃が前日でも順送りへ行かない
- 行程に今日の実目撃が無く、その運番の最新目撃が前日 → 今までどおり順送りの経路（`groupMemberCaches` を引く）へ行く

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

- [ ] **Step 3: 実装する**

`#timeCrossSectionByOperationNumber` の `if (carried) {...}` の後を次にする（`if (carried)` は `'unsighted'` も真なので、オブジェクトかどうかで分ける）。

```ts
            if (carried && carried !== 'unsighted') {
                // （今の carried の処理のまま）
            }
            // 行程に今日の実目撃があり、この枠は誰にも割り当てられない（spec 3.3）
            if (carried === null) {
                return { latestSighting, expectedSighting: null, sightedAsOperation: null };
            }
            // 行程に今日の実目撃が無い。この運番の今日の目撃が別の行程のものなら出さない（今と同じ）
            if (carried === 'unsighted' && latestSighting && searchBaseDate.isSame(getBaseDate(dayjs(latestSighting.sightingTime)))) {
                return { latestSighting, expectedSighting: null, sightedAsOperation: null };
            }
```

- [ ] **Step 4: 全体を回す**

Run: `npx jest`、`npx tsc --noEmit -p tsconfig.json`、`npx eslint src/libs/operation-sighting src/libs/operation/usecase/read-models`
Expected: すべて通る。落ちた既存テストは Task 2 Step 4 と同じく仕分ける

- [ ] **Step 5: コミット**（service の 2 ファイルには prettier をかけない）

```bash
git add src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts
git commit -m "fix: :bug: 目撃情報の時刻断面で、行程に今日の目撃があるのに割り当ての無い運用は順送りにせず不明にする"
```

---

### Task 4: client の real-time カードで推測を「?」にする

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.{ts,html,spec.ts}`

**Interfaces:**
- Consumes: API の `sightedAsOperation`（推測なら非 null）

- [ ] **Step 1: 失敗するテストを書く**

両カードの spec で、`sightedAsOperationNumber` のテスト（`toBe('11K')` / `toBeNull()`）を次に置き換える。

```ts
    it('推測（sightedAsOperation あり）なら「?」を付け、@ は出さない', () => {
        // 既存の組み立てで sightedAsOperation: { operationId: 'o-11', operationNumber: '11K' } を渡す
        fixture.detectChanges();
        const text = fixture.nativeElement.textContent as string;
        expect(component.isInferred()).toBe(true);
        expect(text).toContain('?');
        expect(text).not.toContain('@');
    });
    it('実目撃（sightedAsOperation なし）で今日の目撃なら「?」を付けない', () => {
        // 既存の組み立てで sightedAsOperation: null・目撃時刻は今日
        fixture.detectChanges();
        expect(component.isInferred()).toBe(false);
        expect(fixture.nativeElement.textContent).not.toContain('?');
    });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns 'operation-real-time-(operation|formation)-card'`

- [ ] **Step 3: 実装する**

両カードの ts で `sightedAsOperationNumber` を次に置き換える。

```ts
    /** 車両のつながりから推測した割り当てか（spec 3.3・3.4）。順送りと同じく「?」を付ける */
    readonly isInferred = computed(
        () => !!this.timeCrossSection()?.sightedAsOperation,
    );
```

運用カードの html: 編成番号の式を `(dayCount !== undefined && dayCount !== 0) || isInferred() ? '?' : ''` にし、`@if (sightedAsOperationNumber(); as sightedAs) {...}` のブロックを消す。
編成カードの html: 運番の式を `(dayCount !== 0 || isInferred() ? '?' : '')` にし、`@if (sightedAsOperationNumber(); ...)` のブロックを消す。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns 'operation-real-time'`（出力はファイルに書いて `Tests:` 行を見る）

- [ ] **Step 5: コミット**

```bash
git add src/app/pages/operation/operation-real-time
git commit -m "feat: :sparkles: リアルタイム運用情報で、車両のつながりから推測した運用・編成を @ でなく「?」で示す"
```

---

### Task 5: client の過去の運用情報で、斜線を「?」に替える

**Files:**
- Modify: `src/app/shared/operation-number-tag/operation-number-tag.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.{html,spec.ts}`

**Interfaces:**
- Produces: `OperationNumberTagComponent.inferred = input<boolean>(false)`（`hatched` を置き換える）

- [ ] **Step 1: 失敗するテストを書く**

`operation-number-tag.component.spec.ts` の `describe('hatched…')` を次に置き換える。

```ts
    describe('inferred（車両のつながりから推測した運用）', () => {
        it('inferred 指定時は運番の後ろに「?」を付け、群色の塗りはそのまま', () => {
            fixture.componentRef.setInput('operationNumber', '18K');
            fixture.componentRef.setInput('inferred', true);
            fixture.detectChanges();

            expect(getTagEl()).toHaveTextContent('18K?');
            expect(getTagEl()).toHaveStyle({ backgroundColor: 'rgba(183, 28, 28, 0.12)' });
        });
        it('inferred 未指定時は「?」を付けない', () => {
            fixture.componentRef.setInput('operationNumber', '18K');
            fixture.detectChanges();

            expect(getTagEl().textContent?.trim()).toBe('18K');
        });
    });
```

`operation-past-time-table.component.spec.ts` の「引き継いだ目撃は斜線のタグにし…」を次にする。

```ts
        it('推測した目撃は「?」付きのタグにし、「@11K」は添えない', () => {
            const text = setupCell();

            const inferred = fixture.debugElement
                .queryAll(By.directive(OperationNumberTagComponent))
                .map((d) => d.componentInstance.inferred());
            // 直接（11K）→ 推測（12K）の順
            expect(inferred).toEqual([false, true]);
            expect(text).toContain('12K?');
            expect(text).not.toContain('@');
        });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns 'operation-number-tag|operation-past-time-table'`

- [ ] **Step 3: 実装する**

`operation-number-tag.component.ts`: `hatched` 入力と `hatch()` を消し、次を足す。`label` に「?」を付ける。

```ts
    /** 車両のつながりから推測した運用。運番の後ろに「?」を付ける（ユーザー判断 2026-10-19。斜線は撤回） */
    readonly inferred = input<boolean>(false);

    readonly label = computed(
        () =>
            (this.isRetired() ? '休' : this.operationNumber()) +
            (this.inferred() ? '?' : ''),
    );
```

`operation-number-tag.component.html`: 2 か所の `[style.background-color]` / `[style.background-image]` を、斜線を入れる前の形 `[style.background-color]="operationNumber() | operationNumberColor"` に戻す。

`operation-past-time-table.component.html`: `[hatched]="!!sighting.sightedAsOperation"` を `[inferred]="!!sighting.sightedAsOperation"` に替える。title は残す（「〜の目撃から車両のつながりで推し量った運用」）。マスの説明コメントの「斜線のタグにする（@ は出さない…）」を「「?」付きのタグにする（@ と斜線は出さない。ユーザー判断 2026-10-19）」に直す。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest > ../.context/jest-client-all.txt 2>&1`、`Tests:` 行を確かめる。`npx eslint src/app/shared/operation-number-tag src/app/pages/operation`（サンドボックス外）
Expected: すべて通る

- [ ] **Step 5: コミット**（prettier は `operation-number-tag.component.ts` と `.spec.ts` だけ）

```bash
git add src/app/shared/operation-number-tag src/app/pages/operation/operation-past-time
git commit -m "feat: :sparkles: 過去の運用情報で、推測した運用を斜線でなく「?」付きのタグで示す"
```

---

### Task 6: 実データで確かめる

**Files:** なし（確認だけ）

- [ ] **Step 1: 手元の API が新しいコードで起動し直したことを確かめる**

Run: `docker logs --since 5m sotetsu-lab-v3-api-development-api-1 2>&1 | grep -E "Found [0-9]+ error|successfully started" | tail -3`
Expected: `Found 0 errors` の後に `successfully started`

- [ ] **Step 2: 過去の運用情報（http://localhost:4200/operation/past-time;reference_date=2026-10-05;days=11）で確かめる**

Playwright で各セルのタグの文字列を取り、次を確かめる。

- 10-13 の 3122・10-15 の 5186・10-14 の 3110 が「X › Y? › X?」の形（直接の目撃の数による）
- 10-07 の 114 が `81 › 87`
- 10-05 の 3105 に夕方の 18K の「?」が無い
- 同じ日・同じ運番が、「?」付きで別々の編成に出るマスが 0 件
- 「?」付きのタグがあるセルを 1 つスクショし、文字・行の高さが崩れていないことを目で見る

- [ ] **Step 3: real-time（http://localhost:4200/operation/real-time）で確かめる**

- 運用カード・編成カードで「@」が出ていない
- 「?」付きの運用カードのうち 1 つについて、その運番の今日の目撃と時刻表（Supabase MCP で `operation_sightings`・`trip_operation_lists`）を引き、spec 4 章のどの行に当たるかを説明できること

- [ ] **Step 4: メモリを更新する**

`project_past_time_carry_runs.md` を spec の 7 章に合わせて書き換える（斜線→「?」、real-time も同じ規則、不明の条件）。`project_sighting_carry_display_rule.md`（10-13 の @ の規則）は「2026-10-19 に @ を廃止し「?」に。spec 2026-10-19-sighting-run-assignment-design.md」と追記する。
