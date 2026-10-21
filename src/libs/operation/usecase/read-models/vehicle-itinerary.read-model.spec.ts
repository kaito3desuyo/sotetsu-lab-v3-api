import { ItinerarySegment } from '../../domain/itinerary-link-rule.domain.js';
import {
    VehicleItinerary,
    VehicleItineraryReadModel,
} from './vehicle-itinerary.read-model.js';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};

const seg = (
    p: Partial<ItinerarySegment> &
        Pick<ItinerarySegment, 'id' | 'operationNumber'>,
): ItinerarySegment => ({
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

describe('VehicleItineraryReadModel.create', () => {
    it('決まり 3: 同じ運番の次の区間へ移る（ふつうの折り返し）', () => {
        const a = seg({
            id: 'a',
            operationNumber: '11K',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const b = seg({
            id: 'b',
            operationNumber: '11K',
            startSeconds: t('07:10'),
            endSeconds: t('08:22'),
        });
        const it = VehicleItineraryReadModel.create([b, a]);
        expect(it.all().map((i) => i.segments.map((s) => s.id))).toEqual([
            ['a', 'b'],
        ]);
        expect(it.linksOf('a').next).toEqual({ segment: b, rule: 3 });
    });

    it('決まり 2: 海老名 11K → 12K（別の列車・別のまとまり）', () => {
        const k11 = seg({
            id: '6557',
            operationNumber: '11K',
            endStationId: 'ebina',
            startSeconds: t('07:30'),
            endSeconds: t('08:22'),
            nextTripOperationListId: '3808',
        });
        const k12 = seg({
            id: '3808',
            operationNumber: '12K',
            startStationId: 'ebina',
            startSeconds: t('08:30'),
            endSeconds: t('09:30'),
        });
        const k12later = seg({
            id: '3810',
            operationNumber: '12K',
            startSeconds: t('10:00'),
            endSeconds: t('11:00'),
        });
        const it = VehicleItineraryReadModel.create([k11, k12, k12later]);
        expect(it.all().map((i) => i.segments.map((s) => s.id))).toEqual([
            ['6557', '3808', '3810'],
        ]);
        expect(it.linksOf('6557').next?.rule).toBe(2);
        expect(it.linksOf('3808').previous).toEqual({ segment: k11, rule: 2 });
    });

    it('決まり 1: 赤羽岩淵で 02K と 18K が札を交換する', () => {
        // A1718K: 西谷〜赤羽岩淵 18K、赤羽岩淵〜浦和美園 02K
        const a18 = seg({
            id: 'A18',
            tripId: 'A1718K',
            tripBlockId: 'bA',
            operationNumber: '18K',
            endStationId: 'akabane',
            startSeconds: t('17:00'),
            endSeconds: t('18:32'),
        });
        const a02 = seg({
            id: 'A02',
            tripId: 'A1718K',
            tripBlockId: 'bA',
            operationNumber: '02K',
            startStationId: 'akabane',
            startSeconds: t('18:32'),
            endSeconds: t('18:50'),
        });
        // B1818K: 浦和美園〜赤羽岩淵 02K、赤羽岩淵〜湘南台 18K
        const b02 = seg({
            id: 'B02',
            tripId: 'B1818K',
            tripBlockId: 'bB',
            operationNumber: '02K',
            endStationId: 'akabane',
            startSeconds: t('18:10'),
            endSeconds: t('18:32'),
        });
        const b18 = seg({
            id: 'B18',
            tripId: 'B1818K',
            tripBlockId: 'bB',
            operationNumber: '18K',
            startStationId: 'akabane',
            startSeconds: t('18:32'),
            endSeconds: t('19:40'),
        });
        // 朝の 02K（車両 P）
        const p02 = seg({
            id: 'P02',
            operationNumber: '02K',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const it = VehicleItineraryReadModel.create([a18, a02, b02, b18, p02]);

        expect(it.linksOf('B02').next).toEqual({ segment: b18, rule: 1 });
        expect(it.linksOf('A18').next).toEqual({ segment: a02, rule: 1 });
        // 朝の 02K（P）の行程表は 18:32 以降 18K にいる
        const p = it.itineraryOf('P02')!;
        expect(it.itineraryOf('B18')).toBe(p);
        expect(it.itineraryOf('A02')).not.toBe(p);
        // 19:00 の 02K を受け持つのは A02（車両 Q）
        expect(it.segmentOfOperationAt('02K', t('18:40'))?.id).toBe('A02');
        expect(p.segmentAt(t('19:00'))?.id).toBe('B18');
    });

    it('決まり 1 は答えが 1 つに決まらないとき当てない（併結・分割）', () => {
        const end1 = seg({
            id: 'e1',
            tripBlockId: 'b',
            operationNumber: '01K',
            endStationId: 'S',
            endSeconds: t('10:00'),
        });
        const end2 = seg({
            id: 'e2',
            tripBlockId: 'b',
            operationNumber: '03K',
            endStationId: 'S',
            endSeconds: t('10:00'),
        });
        const start1 = seg({
            id: 's1',
            tripBlockId: 'b',
            operationNumber: '05K',
            startStationId: 'S',
            startSeconds: t('10:00'),
            endSeconds: t('11:00'),
        });
        const it = VehicleItineraryReadModel.create([end1, end2, start1]);
        expect(it.linksOf('e1').next).toBeNull();
        expect(it.linksOf('e2').next).toBeNull();
    });

    it('決まり 2: 02K → 90M → 02K（車両が出かけて帰ってくる）', () => {
        const a = seg({
            id: 'A902K',
            operationNumber: '02K',
            startSeconds: t('10:30'),
            endSeconds: t('11:22'),
            nextTripOperationListId: 'M1',
        });
        const m1 = seg({
            id: 'M1',
            operationNumber: '90M',
            startSeconds: t('11:30'),
            endSeconds: t('12:30'),
        });
        const m2 = seg({
            id: 'M2',
            operationNumber: '90M',
            startSeconds: t('13:00'),
            endSeconds: t('18:40'),
            nextTripOperationListId: 'B1802K',
        });
        const other02 = seg({
            id: 'X02',
            operationNumber: '02K',
            startSeconds: t('12:00'),
            endSeconds: t('13:00'),
        });
        const b = seg({
            id: 'B1802K',
            operationNumber: '02K',
            startSeconds: t('18:57'),
            endSeconds: t('19:30'),
        });
        const it = VehicleItineraryReadModel.create([a, m1, m2, other02, b]);
        expect(
            it
                .all()
                .find((i) => i.segments[0].id === 'A902K')!
                .segments.map((s) => s.id),
        ).toEqual(['A902K', 'M1', 'M2', 'B1802K']);
        // 02K の 12:00 の区間は別の車両
        expect(it.itineraryOf('X02')).not.toBe(it.itineraryOf('A902K'));
    });

    it('決まり 3 の行き先がすでに別の区間から来ているなら、つながない', () => {
        const a = seg({
            id: 'a',
            operationNumber: '12K',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const from11 = seg({
            id: 'f',
            operationNumber: '11K',
            endSeconds: t('08:22'),
            nextTripOperationListId: 'b',
        });
        const b = seg({
            id: 'b',
            operationNumber: '12K',
            startSeconds: t('08:30'),
            endSeconds: t('09:00'),
        });
        const it = VehicleItineraryReadModel.create([a, from11, b]);
        expect(it.linksOf('b').previous?.segment.id).toBe('f');
        expect(it.linksOf('a').next).toBeNull();
    });

    it('次の区間が輪になっていても止まる', () => {
        const a = seg({
            id: 'a',
            operationNumber: '1',
            startSeconds: 1,
            endSeconds: 2,
            nextTripOperationListId: 'b',
        });
        const b = seg({
            id: 'b',
            operationNumber: '2',
            startSeconds: 3,
            endSeconds: 4,
            nextTripOperationListId: 'a',
        });
        const it = VehicleItineraryReadModel.create([a, b]);
        expect(
            it
                .segments()
                .map((s) => s.id)
                .sort(),
        ).toEqual(['a', 'b']);
    });

    it('受け持ちの時刻: 受け持ち中 → 直前に終わった区間 → 最初の区間', () => {
        const a = seg({
            id: 'a',
            operationNumber: '11K',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const b = seg({
            id: 'b',
            operationNumber: '11K',
            startSeconds: t('08:00'),
            endSeconds: t('09:00'),
        });
        const it = VehicleItineraryReadModel.create([a, b]);
        expect(it.segmentOfOperationAt('11K', t('06:30'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('07:30'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('05:00'))?.id).toBe('a');
        expect(it.segmentOfOperationAt('11K', t('23:00'))?.id).toBe('b');
        expect(it.segmentOfOperationAt('99X', t('06:30'))).toBeNull();
    });

    it('決まり 1: 到着時刻は次の区間に属する（赤羽岩淵で 18:32）', () => {
        const a18 = seg({
            id: 'A18',
            tripId: 'A1718K',
            tripBlockId: 'bA',
            operationNumber: '18K',
            endStationId: 'akabane',
            startSeconds: t('17:00'),
            endSeconds: t('18:32'),
        });
        const a02 = seg({
            id: 'A02',
            tripId: 'A1718K',
            tripBlockId: 'bA',
            operationNumber: '02K',
            startStationId: 'akabane',
            startSeconds: t('18:32'),
            endSeconds: t('18:50'),
        });
        const b02 = seg({
            id: 'B02',
            tripId: 'B1818K',
            tripBlockId: 'bB',
            operationNumber: '02K',
            endStationId: 'akabane',
            startSeconds: t('18:10'),
            endSeconds: t('18:32'),
        });
        const b18 = seg({
            id: 'B18',
            tripId: 'B1818K',
            tripBlockId: 'bB',
            operationNumber: '18K',
            startStationId: 'akabane',
            startSeconds: t('18:32'),
            endSeconds: t('19:40'),
        });
        const p02 = seg({
            id: 'P02',
            operationNumber: '02K',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const it = VehicleItineraryReadModel.create([a18, a02, b02, b18, p02]);
        // 18:32 は A02 に属する（A18 ではなく）
        expect(it.segmentOfOperationAt('02K', t('18:32'))?.id).toBe('A02');
    });

    it('決まり 1: ブロックの次の出発が別の駅で、後で同じ駅に戻るとき → つながらない', () => {
        const first = seg({
            id: '1',
            tripBlockId: 'b',
            operationNumber: 'op1',
            endStationId: 'E',
            endSeconds: t('10:00'),
        });
        const viaF = seg({
            id: 'via',
            tripBlockId: 'b',
            operationNumber: 'op2',
            startStationId: 'F',
            startSeconds: t('10:30'),
            endSeconds: t('11:00'),
        });
        const back = seg({
            id: 'back',
            tripBlockId: 'b',
            operationNumber: 'op3',
            startStationId: 'E',
            startSeconds: t('11:30'),
            endSeconds: t('12:00'),
        });
        const it = VehicleItineraryReadModel.create([first, viaF, back]);
        // next の候補は viaF（最初に出発）。viaF は F から出るので条件を満たさない
        expect(it.linksOf('1').next).toBeNull();
    });

    it('決まり 1 (b): ずらして併結（同じ駅に 2 区間が別の秒で着き、1 区間が出る）→ 決まり 1 でつながらない', () => {
        const e1 = seg({
            id: 'e1',
            tripBlockId: 'b',
            operationNumber: '01',
            startSeconds: t('09:00'),
            endStationId: 'E',
            endSeconds: t('10:00'),
        });
        const e2 = seg({
            id: 'e2',
            tripBlockId: 'b',
            operationNumber: '02',
            startSeconds: t('09:30'),
            endStationId: 'E',
            endSeconds: t('10:05'),
        });
        const s1 = seg({
            id: 's1',
            tripBlockId: 'b',
            operationNumber: '03',
            startStationId: 'E',
            startSeconds: t('10:10'),
            endSeconds: t('11:00'),
        });
        const it = VehicleItineraryReadModel.create([e1, e2, s1]);
        expect(it.linksOf('e1').next?.rule).not.toBe(1);
        expect(it.linksOf('e2').next?.rule).not.toBe(1);
    });

    it('決まり 1 (c): ずらして分割（1 区間が着き、同じ駅から別の秒で 2 区間が出る）→ 決まり 1 でつながらない', () => {
        const x = seg({
            id: 'x',
            tripBlockId: 'b',
            operationNumber: '01',
            startSeconds: t('09:00'),
            endStationId: 'E',
            endSeconds: t('10:00'),
        });
        const d1 = seg({
            id: 'd1',
            tripBlockId: 'b',
            operationNumber: '02',
            startStationId: 'E',
            startSeconds: t('10:05'),
            endSeconds: t('10:30'),
        });
        const d2 = seg({
            id: 'd2',
            tripBlockId: 'b',
            operationNumber: '03',
            startStationId: 'E',
            startSeconds: t('10:10'),
            endSeconds: t('11:00'),
        });
        const it = VehicleItineraryReadModel.create([x, d1, d2]);
        expect(it.linksOf('x').next?.rule).not.toBe(1);
    });

    it('決まり 3: リスト内の次の区間がすでに別の区間から来ているなら、リストの i は i+1 にはつながず、i+2 も試さない', () => {
        const a = seg({
            id: 'a',
            operationNumber: 'op',
            startSeconds: t('06:00'),
            endSeconds: t('07:00'),
        });
        const b = seg({
            id: 'b',
            operationNumber: 'op',
            startSeconds: t('08:00'),
            endSeconds: t('09:00'),
        });
        const c = seg({
            id: 'c',
            operationNumber: 'op',
            startSeconds: t('10:00'),
            endSeconds: t('11:00'),
        });
        const fromOther = seg({
            id: 'other',
            operationNumber: 'other',
            endSeconds: t('08:30'),
            nextTripOperationListId: 'b',
        });
        const it = VehicleItineraryReadModel.create([a, b, c, fromOther]);
        // b は already claimed by fromOther なので、a は b にはつながない。c へもつながない（つなぎ方は i → i+1 のみ）
        expect(it.linksOf('a').next).toBeNull();
        expect(it.linksOf('b').previous?.segment.id).toBe('other');
    });
});

describe('VehicleItinerary.segmentAt（半開区間 [start, end) と直前・最初）', () => {
    const a = seg({
        id: 'a',
        operationNumber: '1',
        startSeconds: 100,
        endSeconds: 200,
    });
    const b = seg({
        id: 'b',
        operationNumber: '1',
        startSeconds: 200,
        endSeconds: 300,
    });
    const c = seg({
        id: 'c',
        operationNumber: '1',
        startSeconds: 400,
        endSeconds: 500,
    });
    const chain = VehicleItinerary.create([c, a, b]);

    it('出発の秒ちょうどは、その区間が受け持つ', () => {
        expect(chain.segmentAt(100)?.id).toBe('a');
    });
    it('到着の 1 秒前は、その区間が受け持つ', () => {
        expect(chain.segmentAt(199)?.id).toBe('a');
    });
    it('到着の秒ちょうどは、次の区間に属する（半開区間）', () => {
        expect(chain.segmentAt(200)?.id).toBe('b');
    });
    it('区間の間（待ち時間）は、直前に終わった区間', () => {
        expect(chain.segmentAt(300)?.id).toBe('b');
        expect(chain.segmentAt(399)?.id).toBe('b');
    });
    it('次の出発の秒ちょうどから、その区間に替わる', () => {
        expect(chain.segmentAt(400)?.id).toBe('c');
    });
    it('最後の区間の到着の秒ちょうど以降は、最後の区間のまま', () => {
        expect(chain.segmentAt(500)?.id).toBe('c');
        expect(chain.segmentAt(10 ** 6)?.id).toBe('c');
    });
    it('最初の区間より前なら、最初の区間', () => {
        expect(chain.segmentAt(0)?.id).toBe('a');
        expect(chain.segmentAt(99)?.id).toBe('a');
        expect(chain.segmentAt(-1)?.id).toBe('a');
    });
    it('区間が 1 つだけなら、どの時刻でもその区間', () => {
        const one = VehicleItinerary.create([a]);
        expect(one.segmentAt(0)?.id).toBe('a');
        expect(one.segmentAt(150)?.id).toBe('a');
        expect(one.segmentAt(9999)?.id).toBe('a');
    });
    it('区間が無ければ null', () => {
        expect(VehicleItinerary.create([]).segmentAt(100)).toBeNull();
    });
    it('つながり順が時刻順と違っても、時刻順で受け持ちを決める（出かけて戻る行程）', () => {
        const back = seg({
            id: 'back',
            operationNumber: '1',
            startSeconds: 50,
            endSeconds: 60,
        });
        // chain の並びは a, b, back（つながり順）だが、時刻は back が最初
        const it = VehicleItinerary.create([a, b, back]);
        expect(it.segmentAt(55)?.id).toBe('back');
        expect(it.segmentAt(150)?.id).toBe('a');
        expect(it.segments.map((s) => s.id)).toEqual(['a', 'b', 'back']);
    });
    it('長さ 0 の区間は受け持たず、直前に終わった区間として現れる', () => {
        const z = seg({
            id: 'z',
            operationNumber: '1',
            startSeconds: 600,
            endSeconds: 600,
        });
        const it = VehicleItinerary.create([c, z]);
        expect(it.segmentAt(550)?.id).toBe('c');
        expect(it.segmentAt(600)?.id).toBe('z');
    });
    it('operationNumbers は重複なしで、つながり順の最初に出た順', () => {
        const x = seg({ id: 'x', operationNumber: '2' });
        expect(VehicleItinerary.create([a, x, b]).operationNumbers()).toEqual([
            '1',
            '2',
        ]);
    });
    it('segments はつながり順のまま返す', () => {
        expect(chain.segments.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    });
});

describe('VehicleItineraryReadModel の引き口（境界）', () => {
    it('区間が無ければ、行程も区間も無い', () => {
        const m = VehicleItineraryReadModel.create([]);
        expect(m.all()).toEqual([]);
        expect(m.segments()).toEqual([]);
        expect(m.itineraryOf('nothing')).toBeUndefined();
        expect(m.segmentOfOperationAt('1', 0)).toBeNull();
        expect(m.itineraryOfOperationAt('1', 0)).toBeUndefined();
    });
    it('知らない id のつながりは前後とも null', () => {
        const m = VehicleItineraryReadModel.create([
            seg({ id: 'a', operationNumber: '1' }),
        ]);
        expect(m.linksOf('nothing')).toEqual({ previous: null, next: null });
    });
    it('つながらない 1 区間は 1 区間だけの行程になる', () => {
        const a = seg({ id: 'a', operationNumber: '1' });
        const m = VehicleItineraryReadModel.create([a]);
        expect(m.all()).toHaveLength(1);
        expect(m.itineraryOf('a')?.segments).toEqual([a]);
        expect(m.linksOf('a')).toEqual({ previous: null, next: null });
    });
    it('つながらない区間どうしは別々の行程になり、全区間がどれかの行程に入る', () => {
        const m = VehicleItineraryReadModel.create([
            seg({ id: 'a', operationNumber: '1', startSeconds: 1 }),
            seg({ id: 'b', operationNumber: '2', startSeconds: 2 }),
            seg({ id: 'c', operationNumber: '3', startSeconds: 3 }),
        ]);
        expect(m.all()).toHaveLength(3);
        expect(
            m
                .segments()
                .map((s) => s.id)
                .sort(),
        ).toEqual(['a', 'b', 'c']);
    });
    it('行程の並びは頭の区間の時刻順', () => {
        const m = VehicleItineraryReadModel.create([
            seg({ id: 'late', operationNumber: '2', startSeconds: 500 }),
            seg({ id: 'early', operationNumber: '1', startSeconds: 100 }),
        ]);
        expect(m.all().map((i) => i.segments[0].id)).toEqual(['early', 'late']);
    });
    it('itineraryOf は行程の途中の区間からも同じ行程を返す', () => {
        const a = seg({
            id: 'a',
            operationNumber: '1',
            startSeconds: 0,
            endSeconds: 10,
        });
        const b = seg({
            id: 'b',
            operationNumber: '1',
            startSeconds: 20,
            endSeconds: 30,
        });
        const m = VehicleItineraryReadModel.create([a, b]);
        expect(m.itineraryOf('a')).toBe(m.itineraryOf('b'));
    });
    it('輪になった行程は、いちばん早い区間から始めて全区間を 1 回ずつ入れる', () => {
        const a = seg({
            id: 'a',
            operationNumber: '1',
            startSeconds: 1,
            endSeconds: 2,
            nextTripOperationListId: 'b',
        });
        const b = seg({
            id: 'b',
            operationNumber: '2',
            startSeconds: 3,
            endSeconds: 4,
            nextTripOperationListId: 'c',
        });
        const c = seg({
            id: 'c',
            operationNumber: '3',
            startSeconds: 5,
            endSeconds: 6,
            nextTripOperationListId: 'a',
        });
        const m = VehicleItineraryReadModel.create([c, b, a]);
        expect(m.all()).toHaveLength(1);
        expect(m.all()[0].segments.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    });
    it('頭のある行程と輪が混ざっていても、全区間を 1 回ずつ入れる', () => {
        const a = seg({
            id: 'a',
            operationNumber: '1',
            startSeconds: 1,
            endSeconds: 2,
            nextTripOperationListId: 'b',
        });
        const b = seg({
            id: 'b',
            operationNumber: '2',
            startSeconds: 3,
            endSeconds: 4,
            nextTripOperationListId: 'a',
        });
        const solo = seg({
            id: 'solo',
            operationNumber: '3',
            startSeconds: 10,
            endSeconds: 11,
        });
        const m = VehicleItineraryReadModel.create([a, b, solo]);
        const ids = m.segments().map((s) => s.id);
        expect(ids.sort()).toEqual(['a', 'b', 'solo']);
    });
    it('入力の配列を並べ替えない', () => {
        const input = [
            seg({ id: 'b', operationNumber: '1', startSeconds: 20 }),
            seg({ id: 'a', operationNumber: '1', startSeconds: 10 }),
        ];
        VehicleItineraryReadModel.create(input);
        expect(input.map((s) => s.id)).toEqual(['b', 'a']);
    });
    it('segmentOfOperationAt は半開区間: 到着の秒ちょうどは次の区間', () => {
        const a = seg({
            id: 'a',
            operationNumber: '1',
            startSeconds: 100,
            endSeconds: 200,
        });
        const b = seg({
            id: 'b',
            operationNumber: '1',
            startSeconds: 200,
            endSeconds: 300,
        });
        const m = VehicleItineraryReadModel.create([a, b]);
        expect(m.segmentOfOperationAt('1', 199)?.id).toBe('a');
        expect(m.segmentOfOperationAt('1', 200)?.id).toBe('b');
        expect(m.segmentOfOperationAt('1', 300)?.id).toBe('b');
    });
    it('segmentOfOperationAt は別の運番の区間を混ぜない', () => {
        const m = VehicleItineraryReadModel.create([
            seg({
                id: 'a',
                operationNumber: '1',
                startSeconds: 100,
                endSeconds: 200,
            }),
            seg({
                id: 'b',
                operationNumber: '2',
                startSeconds: 100,
                endSeconds: 200,
            }),
        ]);
        expect(m.segmentOfOperationAt('2', 150)?.id).toBe('b');
    });
    it('itineraryOfOperationAt は受け持つ区間の行程を返す（運番替わりの前後で別の行程）', () => {
        const p = seg({
            id: 'p',
            operationNumber: '02K',
            startSeconds: 0,
            endSeconds: 100,
        });
        const q = seg({
            id: 'q',
            operationNumber: '02K',
            startSeconds: 500,
            endSeconds: 600,
            nextTripOperationListId: null,
        });
        const other = seg({
            id: 'o',
            operationNumber: '18K',
            startSeconds: 100,
            endSeconds: 200,
        });
        const m = VehicleItineraryReadModel.create([
            { ...p, nextTripOperationListId: 'o' },
            q,
            other,
        ]);
        expect(m.itineraryOfOperationAt('02K', 50)).toBe(m.itineraryOf('p'));
        expect(m.itineraryOfOperationAt('02K', 150)).toBe(m.itineraryOf('p'));
        expect(m.itineraryOf('p')).toBe(m.itineraryOf('o'));
    });
});

describe('VehicleItineraryReadModel.segmentOfSightingAt', () => {
    // 18K（5:08〜8:52）→ 17K（9:00〜17:02）→ 18K（17:09〜21:22）
    const model = VehicleItineraryReadModel.create([
        seg({
            id: 'm18',
            operationNumber: '18K',
            startSeconds: t('05:08'),
            endSeconds: t('08:52'),
            nextTripOperationListId: 'd17',
        }),
        seg({
            id: 'd17',
            operationNumber: '17K',
            startSeconds: t('09:00'),
            endSeconds: t('17:02'),
            nextTripOperationListId: 'e18',
        }),
        seg({
            id: 'e18',
            operationNumber: '18K',
            startSeconds: t('17:09'),
            endSeconds: t('21:22'),
        }),
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
        expect(itinerary.runs().map((r) => r.map((s) => s.id))).toEqual([
            ['m18'],
            ['d17'],
            ['e18'],
        ]);
        expect(itinerary.runOf(itinerary.segments[2])).toBe(
            itinerary.runs()[2],
        );
    });
});
