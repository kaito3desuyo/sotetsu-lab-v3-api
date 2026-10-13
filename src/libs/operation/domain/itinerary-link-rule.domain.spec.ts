import {
    compareSegmentsByTime,
    ItineraryLinks,
    ItineraryLinkRule,
    ItinerarySegment,
} from './itinerary-link-rule.domain';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};

const seg = (
    id: string,
    operationNumber: string,
    p: Partial<ItinerarySegment> = {},
): ItinerarySegment => ({
    id,
    tripId: `trip-${id}`,
    tripBlockId: `block-${id}`,
    operationId: `op-${operationNumber}`,
    operationNumber,
    startStationId: 'X',
    endStationId: 'Y',
    startSeconds: 0,
    endSeconds: 0,
    nextTripOperationListId: null,
    ...p,
});

/** from → to の組を { from: 'to/rule' } の形にして比べやすくする */
const edges = (links: ItineraryLinks) =>
    Object.fromEntries(
        [...links.next].map(([from, l]) => [from, `${l.segment.id}/${l.rule}`]),
    );
const back = (links: ItineraryLinks) =>
    Object.fromEntries(
        [...links.previous].map(([to, l]) => [to, `${l.segment.id}/${l.rule}`]),
    );

describe('compareSegmentsByTime', () => {
    it('出発が早い方が先になる', () => {
        expect(
            compareSegmentsByTime(
                seg('b', '1', { startSeconds: 1, endSeconds: 9 }),
                seg('a', '1', { startSeconds: 2, endSeconds: 3 }),
            ),
        ).toBeLessThan(0);
    });
    it('出発が同じなら到着が早い方が先になる', () => {
        expect(
            compareSegmentsByTime(
                seg('b', '1', { startSeconds: 1, endSeconds: 3 }),
                seg('a', '1', { startSeconds: 1, endSeconds: 9 }),
            ),
        ).toBeLessThan(0);
    });
    it('出発も到着も同じなら id の順になる', () => {
        expect(
            compareSegmentsByTime(seg('a', '1'), seg('b', '1')),
        ).toBeLessThan(0);
        expect(
            compareSegmentsByTime(seg('b', '1'), seg('a', '1')),
        ).toBeGreaterThan(0);
        expect(compareSegmentsByTime(seg('a', '1'), seg('a', '1'))).toBe(0);
    });
});

describe('ItineraryLinkRule.resolve', () => {
    describe('入力の形', () => {
        it('空配列ならつながりは無い', () => {
            const l = ItineraryLinkRule.resolve([]);
            expect(l.next.size).toBe(0);
            expect(l.previous.size).toBe(0);
        });
        it('1 区間だけならつながりは無い', () => {
            const l = ItineraryLinkRule.resolve([
                seg('a', '1', { startSeconds: 1, endSeconds: 2 }),
            ]);
            expect(l.next.size).toBe(0);
            expect(l.previous.size).toBe(0);
        });
        it('入力の配列を並べ替えない', () => {
            const input = [
                seg('b', '1', { startSeconds: 10, endSeconds: 20 }),
                seg('a', '1', { startSeconds: 0, endSeconds: 5 }),
            ];
            ItineraryLinkRule.resolve(input);
            expect(input.map((s) => s.id)).toEqual(['b', 'a']);
        });
        it('入力の並び順が違っても同じ結果になる', () => {
            const list = [
                seg('a', '1', { startSeconds: 0, endSeconds: 5 }),
                seg('b', '1', { startSeconds: 10, endSeconds: 20 }),
                seg('c', '1', { startSeconds: 30, endSeconds: 40 }),
            ];
            const forward = edges(ItineraryLinkRule.resolve(list));
            const reversed = edges(
                ItineraryLinkRule.resolve([...list].reverse()),
            );
            expect(reversed).toEqual(forward);
            expect(forward).toEqual({ a: 'b/3', b: 'c/3' });
        });
        it('next と previous は対になっている', () => {
            const l = ItineraryLinkRule.resolve([
                seg('a', '1', { startSeconds: 0, endSeconds: 5 }),
                seg('b', '1', { startSeconds: 10, endSeconds: 20 }),
            ]);
            expect(edges(l)).toEqual({ a: 'b/3' });
            expect(back(l)).toEqual({ b: 'a/3' });
        });
    });

    describe('決まり 1: 列車の途中の運番替わり', () => {
        const A = seg('A', '18K', {
            tripBlockId: 'blk',
            endStationId: 'akabane',
            startSeconds: t('17:00'),
            endSeconds: t('18:32'),
        });
        const B = seg('B', '02K', {
            tripBlockId: 'blk',
            startStationId: 'akabane',
            startSeconds: t('18:32'),
            endSeconds: t('18:50'),
        });

        it('同じ trip_block の中で運番が替わる区間をつなぐ', () => {
            expect(edges(ItineraryLinkRule.resolve([A, B]))).toEqual({
                A: 'B/1',
            });
        });
        it('つないだ区間の rule は 1 になる', () => {
            const l = ItineraryLinkRule.resolve([A, B]);
            expect(l.next.get('A')?.rule).toBe(1);
            expect(l.previous.get('B')?.rule).toBe(1);
        });
        it('同じ運番の同じ trip_block 内でも、駅と時刻が合えば決まり 1 が先に当たる', () => {
            const same = { ...B, operationNumber: '18K' };
            expect(edges(ItineraryLinkRule.resolve([A, same]))).toEqual({
                A: 'B/1',
            });
        });
        it('着駅と発駅が違えばつながない', () => {
            const far = { ...B, startStationId: 'other' };
            expect(edges(ItineraryLinkRule.resolve([A, far]))).toEqual({});
        });
        it('別の trip_block ならつながない', () => {
            const other = { ...B, tripBlockId: 'blk2' };
            expect(edges(ItineraryLinkRule.resolve([A, other]))).toEqual({});
        });
        it('次の出発が到着より前（重なる）ならつながない', () => {
            const early = { ...B, startSeconds: t('18:00') };
            expect(edges(ItineraryLinkRule.resolve([A, early]))).toEqual({});
        });
        it('次の出発が到着より後（待ち時間あり）でも、駅が同じで 1 対 1 ならつなぐ', () => {
            const later = {
                ...B,
                startSeconds: t('18:40'),
                endSeconds: t('19:00'),
            };
            expect(edges(ItineraryLinkRule.resolve([A, later]))).toEqual({
                A: 'B/1',
            });
        });
        it('3 つ以上の区間が一列に並ぶ列車は、順につなぐ', () => {
            const C = seg('C', '03K', {
                tripBlockId: 'blk',
                startStationId: 'Y',
                startSeconds: t('18:50'),
                endSeconds: t('19:10'),
            });
            const B2 = { ...B, endStationId: 'Y' };
            expect(edges(ItineraryLinkRule.resolve([A, B2, C]))).toEqual({
                A: 'B/1',
                B: 'C/1',
            });
        });
        it('同じ駅・同じ時刻に終わる区間が 2 つ（併結）ならつながない', () => {
            const A2 = { ...A, id: 'A2', operationNumber: '19K' };
            const l = ItineraryLinkRule.resolve([A, A2, B]);
            expect(l.next.get('A')).toBeUndefined();
            expect(l.next.get('A2')).toBeUndefined();
        });
        it('併結の片方が B と同じ運番なら、決まり 3 が別の規則として働く', () => {
            const A2 = {
                ...A,
                id: 'A2',
                operationNumber: '02K',
                startSeconds: t('10:00'),
                endSeconds: t('18:32'),
            };
            const l = ItineraryLinkRule.resolve([A, A2, B]);
            expect(edges(l)).toEqual({ A2: 'B/3' });
        });
        it('同じ駅・同じ時刻に始まる区間が 2 つ（分割）ならつながない', () => {
            const B2 = { ...B, id: 'B2', operationNumber: '04K' };
            const l = ItineraryLinkRule.resolve([A, B, B2]);
            expect(l.next.get('A')).toBeUndefined();
        });
        it('ずらして併結（別の秒で同じ駅に 2 区間が着く）でも決まり 1 ではつながない', () => {
            const e1 = seg('e1', '01', {
                tripBlockId: 'b',
                startSeconds: t('09:00'),
                endStationId: 'E',
                endSeconds: t('10:00'),
            });
            const e2 = seg('e2', '02', {
                tripBlockId: 'b',
                startSeconds: t('09:30'),
                endStationId: 'E',
                endSeconds: t('10:05'),
            });
            const s1 = seg('s1', '03', {
                tripBlockId: 'b',
                startStationId: 'E',
                startSeconds: t('10:10'),
                endSeconds: t('11:00'),
            });
            const l = ItineraryLinkRule.resolve([e1, e2, s1]);
            expect(l.next.get('e1')?.rule).not.toBe(1);
            expect(l.next.get('e2')?.rule).not.toBe(1);
        });
        it('同時刻の並びは出発 → 到着 → id の順で決まる（到着が早い方が先の出発になる）', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'X',
                startSeconds: 0,
                endSeconds: 100,
            });
            // 同じ出発 100。b（X から 100〜150）は d（Y から 100〜200）より先に並ぶ
            const b = seg('b', '2', {
                tripBlockId: 'blk',
                startStationId: 'X',
                startSeconds: 100,
                endSeconds: 150,
            });
            const d = seg('d', '3', {
                tripBlockId: 'blk',
                startStationId: 'Y',
                startSeconds: 100,
                endSeconds: 200,
            });
            expect(edges(ItineraryLinkRule.resolve([a, b, d]))).toEqual({
                a: 'b/1',
            });
        });
        it('出発も到着も同じ同時刻なら id の小さい方が次の出発とみなされる', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'X',
                startSeconds: 0,
                endSeconds: 100,
            });
            const m = seg('m', '2', {
                tripBlockId: 'blk',
                startStationId: 'X',
                startSeconds: 100,
                endSeconds: 200,
            });
            const n = seg('n', '3', {
                tripBlockId: 'blk',
                startStationId: 'Y',
                startSeconds: 100,
                endSeconds: 200,
            });
            // m（X 発）が先頭。X 発は m だけなので 1 対 1
            expect(edges(ItineraryLinkRule.resolve([a, m, n]))).toEqual({
                a: 'm/1',
            });
            // id を入れ替えると先頭が Y 発になり、駅が合わずつながらない
            const z = { ...m, id: 'z' };
            expect(edges(ItineraryLinkRule.resolve([a, z, n]))).toEqual({});
        });
        it('次に出る区間が別の駅で、後で同じ駅に戻ってもつながらない', () => {
            const first = seg('1', 'op1', {
                tripBlockId: 'b',
                endStationId: 'E',
                endSeconds: t('10:00'),
            });
            const viaF = seg('via', 'op2', {
                tripBlockId: 'b',
                startStationId: 'F',
                startSeconds: t('10:30'),
                endSeconds: t('11:00'),
            });
            const backE = seg('back', 'op3', {
                tripBlockId: 'b',
                startStationId: 'E',
                startSeconds: t('11:30'),
                endSeconds: t('12:00'),
            });
            expect(
                edges(ItineraryLinkRule.resolve([first, viaF, backE])),
            ).toEqual({});
        });
        it('出発と到着が同じ秒（長さ 0）の区間だけでも、自分自身にはつながない', () => {
            const zero = seg('z', '1', {
                tripBlockId: 'b',
                startSeconds: 100,
                endSeconds: 100,
            });
            expect(ItineraryLinkRule.resolve([zero]).next.size).toBe(0);
        });
        it('長さ 0 の区間が間にあっても、例外や自己ループにならない', () => {
            const a = seg('a', '1', {
                tripBlockId: 'b',
                endStationId: 'X',
                startSeconds: 0,
                endSeconds: 100,
            });
            const zero = seg('z', '2', {
                tripBlockId: 'b',
                startStationId: 'X',
                endStationId: 'X',
                startSeconds: 100,
                endSeconds: 100,
            });
            const c = seg('c', '3', {
                tripBlockId: 'b',
                startStationId: 'X',
                startSeconds: 100,
                endSeconds: 200,
            });
            const l = ItineraryLinkRule.resolve([a, zero, c]);
            for (const [from, link] of l.next) {
                expect(link.segment.id).not.toBe(from);
            }
        });
        it('trip_block が違えば、別のまとまりの区間は判定に混ざらない', () => {
            const a1 = seg('a1', '1', {
                tripBlockId: 'p',
                endStationId: 'S',
                endSeconds: 100,
            });
            const b1 = seg('b1', '2', {
                tripBlockId: 'p',
                startStationId: 'S',
                startSeconds: 100,
                endSeconds: 200,
            });
            const a2 = seg('a2', '3', {
                tripBlockId: 'q',
                endStationId: 'S',
                endSeconds: 100,
            });
            expect(edges(ItineraryLinkRule.resolve([a1, b1, a2]))).toEqual({
                a1: 'b1/1',
            });
        });
    });

    describe('決まり 2: next_trip_operation_list_id', () => {
        it('次の区間が入っていればそこへつなぐ', () => {
            const a = seg('a', '11K', {
                endSeconds: t('08:22'),
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '12K', {
                startSeconds: t('08:30'),
                endSeconds: t('09:00'),
            });
            const l = ItineraryLinkRule.resolve([a, b]);
            expect(edges(l)).toEqual({ a: 'b/2' });
            expect(back(l)).toEqual({ b: 'a/2' });
        });
        it('決まり 1 で既に次がある区間の決まり 2 は無視する', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'S',
                endSeconds: 100,
                nextTripOperationListId: 'z',
            });
            const b = seg('b', '2', {
                tripBlockId: 'blk',
                startStationId: 'S',
                startSeconds: 100,
                endSeconds: 200,
            });
            const z = seg('z', '9', { startSeconds: 300, endSeconds: 400 });
            const l = ItineraryLinkRule.resolve([a, b, z]);
            expect(edges(l)).toEqual({ a: 'b/1' });
            expect(l.previous.has('z')).toBe(false);
        });
        it('行き先が決まり 1 で既に前を持つなら決まり 2 は無視する', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'S',
                endSeconds: 100,
            });
            const b = seg('b', '2', {
                tripBlockId: 'blk',
                startStationId: 'S',
                startSeconds: 100,
                endSeconds: 200,
            });
            const z = seg('z', '9', {
                startSeconds: 0,
                endSeconds: 50,
                nextTripOperationListId: 'b',
            });
            const l = ItineraryLinkRule.resolve([a, b, z]);
            expect(back(l)).toEqual({ b: 'a/1' });
            expect(l.next.get('z')).toBeUndefined();
        });
        it('存在しない id を指していれば無視する（決まり 3 に落ちる）', () => {
            const a = seg('a', '1', {
                startSeconds: 0,
                endSeconds: 10,
                nextTripOperationListId: 'nothing',
            });
            const b = seg('b', '1', { startSeconds: 20, endSeconds: 30 });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/3',
            });
        });
        it('存在しない id を指す区間は、同じ運番の次が無ければ行き先なしになる', () => {
            const a = seg('a', '1', { nextTripOperationListId: 'nothing' });
            expect(edges(ItineraryLinkRule.resolve([a]))).toEqual({});
        });
        it('自分自身を指していてもつながない', () => {
            const a = seg('a', '1', { nextTripOperationListId: 'a' });
            expect(ItineraryLinkRule.resolve([a]).next.size).toBe(0);
        });
        it('自分自身を指す区間は、同じ運番の次の区間へ決まり 3 でつながる', () => {
            const a = seg('a', '1', {
                startSeconds: 0,
                endSeconds: 10,
                nextTripOperationListId: 'a',
            });
            const b = seg('b', '1', { startSeconds: 20, endSeconds: 30 });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/3',
            });
        });
        it('同じ行き先を 2 つの区間が指すなら、時刻の早い方だけがつながる', () => {
            const early = seg('early', '1', {
                startSeconds: 0,
                endSeconds: 10,
                nextTripOperationListId: 'z',
            });
            const late = seg('late', '2', {
                startSeconds: 20,
                endSeconds: 30,
                nextTripOperationListId: 'z',
            });
            const z = seg('z', '3', { startSeconds: 100, endSeconds: 200 });
            const l = ItineraryLinkRule.resolve([late, early, z]);
            expect(back(l)).toEqual({ z: 'early/2' });
            expect(l.next.get('late')).toBeUndefined();
        });
        it('決まり 2 でつながった区間は、決まり 3 で別の行き先にはつながない', () => {
            const a = seg('a', '1', {
                startSeconds: 0,
                endSeconds: 10,
                nextTripOperationListId: 'z',
            });
            const b = seg('b', '1', { startSeconds: 20, endSeconds: 30 });
            const z = seg('z', '9', { startSeconds: 40, endSeconds: 50 });
            expect(edges(ItineraryLinkRule.resolve([a, b, z]))).toEqual({
                a: 'z/2',
            });
        });
        it('別の trip_block・別の運番へも次の区間でつなげる', () => {
            const a = seg('a', '11K', {
                tripBlockId: 'p',
                endSeconds: 10,
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '12K', {
                tripBlockId: 'q',
                startSeconds: 20,
                endSeconds: 30,
            });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/2',
            });
        });
        it('時刻が戻る行き先（過去の区間）でも、指されたとおりにつなぐ', () => {
            const a = seg('a', '1', {
                startSeconds: 100,
                endSeconds: 200,
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '2', { startSeconds: 0, endSeconds: 50 });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/2',
            });
        });
    });

    describe('決まり 3: 同じ運番の次の区間', () => {
        it('同じ運番の次の区間へつなぐ（時刻順）', () => {
            const a = seg('a', '11K', { startSeconds: 0, endSeconds: 10 });
            const b = seg('b', '11K', { startSeconds: 20, endSeconds: 30 });
            const c = seg('c', '11K', { startSeconds: 40, endSeconds: 50 });
            expect(edges(ItineraryLinkRule.resolve([c, a, b]))).toEqual({
                a: 'b/3',
                b: 'c/3',
            });
        });
        it('行き先がすでに別の区間から来ているならつながない', () => {
            const a = seg('a', '12K', { startSeconds: 0, endSeconds: 10 });
            const f = seg('f', '11K', {
                startSeconds: 5,
                endSeconds: 15,
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '12K', { startSeconds: 20, endSeconds: 30 });
            const l = ItineraryLinkRule.resolve([a, f, b]);
            expect(l.previous.get('b')?.segment.id).toBe('f');
            expect(l.next.get('a')).toBeUndefined();
        });
        it('運番ごとに別々の時刻順で並べる（運番どうしを混ぜない）', () => {
            const a1 = seg('a1', 'A', { startSeconds: 0, endSeconds: 10 });
            const b1 = seg('b1', 'B', { startSeconds: 5, endSeconds: 15 });
            const a2 = seg('a2', 'A', { startSeconds: 20, endSeconds: 30 });
            const b2 = seg('b2', 'B', { startSeconds: 25, endSeconds: 35 });
            expect(edges(ItineraryLinkRule.resolve([a1, b1, a2, b2]))).toEqual({
                a1: 'a2/3',
                b1: 'b2/3',
            });
        });
        it('運番ごとに 1 区間だけなら何にもつながない', () => {
            expect(
                edges(
                    ItineraryLinkRule.resolve([
                        seg('a', 'A', { startSeconds: 0, endSeconds: 10 }),
                        seg('b', 'B', { startSeconds: 20, endSeconds: 30 }),
                    ]),
                ),
            ).toEqual({});
        });
        it('区間が時間的に重なっていても、出発順につなぐ', () => {
            const a = seg('a', 'A', { startSeconds: 0, endSeconds: 100 });
            const b = seg('b', 'A', { startSeconds: 50, endSeconds: 120 });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/3',
            });
        });
        it('出発と到着が同じなら id の順につなぐ', () => {
            const x = seg('x', 'A', { startSeconds: 0, endSeconds: 10 });
            const y = seg('y', 'A', { startSeconds: 0, endSeconds: 10 });
            expect(edges(ItineraryLinkRule.resolve([y, x]))).toEqual({
                x: 'y/3',
            });
        });
        it('i+1 が埋まっていても i+2 には飛ばない', () => {
            const a = seg('a', 'op', { startSeconds: 0, endSeconds: 10 });
            const b = seg('b', 'op', { startSeconds: 20, endSeconds: 30 });
            const c = seg('c', 'op', { startSeconds: 40, endSeconds: 50 });
            const other = seg('other', 'other', {
                startSeconds: 12,
                endSeconds: 15,
                nextTripOperationListId: 'b',
            });
            const l = ItineraryLinkRule.resolve([a, b, c, other]);
            expect(l.next.get('a')).toBeUndefined();
            expect(edges(l)).toEqual({ other: 'b/2', b: 'c/3' });
        });
    });

    describe('優先順位 1 → 2 → 3 が混ざる場合', () => {
        it('1・2・3 がそれぞれ別の区間に当たる', () => {
            const p1 = seg('p1', '1', {
                tripBlockId: 'blk',
                endStationId: 'S',
                startSeconds: 0,
                endSeconds: 100,
            });
            const p2 = seg('p2', '2', {
                tripBlockId: 'blk',
                startStationId: 'S',
                startSeconds: 100,
                endSeconds: 200,
                nextTripOperationListId: 'q1',
            });
            const q1 = seg('q1', '3', { startSeconds: 300, endSeconds: 400 });
            const q2 = seg('q2', '3', { startSeconds: 500, endSeconds: 600 });
            const l = ItineraryLinkRule.resolve([q2, q1, p2, p1]);
            expect(edges(l)).toEqual({
                p1: 'p2/1',
                p2: 'q1/2',
                q1: 'q2/3',
            });
        });
        it('決まり 1 の行き先が決まり 2 の行き先と衝突したら、決まり 1 が勝つ', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'S',
                endSeconds: 100,
            });
            const b = seg('b', '2', {
                tripBlockId: 'blk',
                startStationId: 'S',
                startSeconds: 100,
                endSeconds: 200,
            });
            const z = seg('z', '9', {
                startSeconds: 0,
                endSeconds: 10,
                nextTripOperationListId: 'b',
            });
            const l = ItineraryLinkRule.resolve([a, b, z]);
            expect(l.previous.get('b')?.segment.id).toBe('a');
        });
    });

    describe('輪になるデータ', () => {
        it('決まり 2 の輪（a → b → a）でも止まり、両方のつながりを返す', () => {
            const a = seg('a', '1', {
                startSeconds: 1,
                endSeconds: 2,
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '2', {
                startSeconds: 3,
                endSeconds: 4,
                nextTripOperationListId: 'a',
            });
            const l = ItineraryLinkRule.resolve([a, b]);
            expect(edges(l)).toEqual({ a: 'b/2', b: 'a/2' });
        });
        it('3 区間の輪（a → b → c → a）でも止まる', () => {
            const a = seg('a', '1', {
                startSeconds: 1,
                endSeconds: 2,
                nextTripOperationListId: 'b',
            });
            const b = seg('b', '2', {
                startSeconds: 3,
                endSeconds: 4,
                nextTripOperationListId: 'c',
            });
            const c = seg('c', '3', {
                startSeconds: 5,
                endSeconds: 6,
                nextTripOperationListId: 'a',
            });
            expect(edges(ItineraryLinkRule.resolve([a, b, c]))).toEqual({
                a: 'b/2',
                b: 'c/2',
                c: 'a/2',
            });
        });
    });

    describe('日跨ぎ', () => {
        it('24 時を超える秒（鉄道日の翌日 0 時台など）でも時刻順に決まり 3 でつなぐ', () => {
            const late = seg('late', '9', {
                startSeconds: t('23:30'),
                endSeconds: 24 * 3600 + t('00:20'),
            });
            const after = seg('after', '9', {
                startSeconds: 24 * 3600 + t('00:40'),
                endSeconds: 24 * 3600 + t('01:10'),
            });
            const morning = seg('morning', '9', {
                startSeconds: t('05:00'),
                endSeconds: t('06:00'),
            });
            expect(
                edges(ItineraryLinkRule.resolve([after, late, morning])),
            ).toEqual({ morning: 'late/3', late: 'after/3' });
        });
        it('日を跨いだ到着でも、同じ trip_block で駅が合えば決まり 1 でつなぐ', () => {
            const a = seg('a', '1', {
                tripBlockId: 'blk',
                endStationId: 'S',
                startSeconds: t('23:00'),
                endSeconds: 24 * 3600 + t('00:10'),
            });
            const b = seg('b', '2', {
                tripBlockId: 'blk',
                startStationId: 'S',
                startSeconds: 24 * 3600 + t('00:10'),
                endSeconds: 24 * 3600 + t('00:50'),
            });
            expect(edges(ItineraryLinkRule.resolve([a, b]))).toEqual({
                a: 'b/1',
            });
        });
    });

    describe('実データの形', () => {
        it('平日 16K 9385（星川 11:27）→ 15K 9401（16:51）は決まり 2', () => {
            const s9385 = seg('9385', '16K', {
                tripBlockId: 'tb-9385',
                endStationId: 'hoshikawa',
                startSeconds: t('10:40'),
                endSeconds: t('11:27'),
                nextTripOperationListId: '9401',
            });
            const s9401 = seg('9401', '15K', {
                tripBlockId: 'tb-9401',
                startStationId: 'hoshikawa',
                startSeconds: t('16:51'),
                endSeconds: t('17:30'),
            });
            const k16Later = seg('9387', '16K', {
                tripBlockId: 'tb-9387',
                startSeconds: t('12:00'),
                endSeconds: t('13:00'),
            });
            const l = ItineraryLinkRule.resolve([s9385, s9401, k16Later]);
            expect(l.next.get('9385')).toEqual({ segment: s9401, rule: 2 });
            expect(l.previous.get('9401')).toEqual({
                segment: s9385,
                rule: 2,
            });
            // 決まり 2 で出ていった 9385 の後ろの 9387 は、同じ運番の前の区間に決まり 3 でつながらない
            expect(l.previous.get('9387')).toBeUndefined();
        });
        it('平日 11K 6557 海老名 08:22 → 12K 3808 08:30 は決まり 2', () => {
            const s6557 = seg('6557', '11K', {
                endStationId: 'ebina',
                startSeconds: t('07:30'),
                endSeconds: t('08:22'),
                nextTripOperationListId: '3808',
            });
            const s3808 = seg('3808', '12K', {
                startStationId: 'ebina',
                startSeconds: t('08:30'),
                endSeconds: t('09:30'),
            });
            const l = ItineraryLinkRule.resolve([s3808, s6557]);
            expect(edges(l)).toEqual({ '6557': '3808/2' });
        });
        it('02K → 90M → 02K（車両が出かけて戻る）は決まり 2 と 3 でつながる', () => {
            const a = seg('A902K', '02K', {
                startSeconds: t('10:30'),
                endSeconds: t('11:22'),
                nextTripOperationListId: 'M1',
            });
            const m1 = seg('M1', '90M', {
                startSeconds: t('11:30'),
                endSeconds: t('12:30'),
            });
            const m2 = seg('M2', '90M', {
                startSeconds: t('13:00'),
                endSeconds: t('18:40'),
                nextTripOperationListId: 'B1802K',
            });
            const other02 = seg('X02', '02K', {
                startSeconds: t('12:00'),
                endSeconds: t('13:00'),
            });
            const b = seg('B1802K', '02K', {
                startSeconds: t('18:57'),
                endSeconds: t('19:30'),
            });
            const l = ItineraryLinkRule.resolve([a, m1, m2, other02, b]);
            expect(edges(l)).toEqual({
                A902K: 'M1/2',
                M1: 'M2/3',
                M2: 'B1802K/2',
            });
        });
    });
});
