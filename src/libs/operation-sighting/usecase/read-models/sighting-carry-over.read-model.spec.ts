import dayjs from 'dayjs';
import { ItinerarySegment } from 'src/libs/operation/domain/itinerary-link-rule.domain';
import { VehicleItineraryReadModel } from 'src/libs/operation/usecase/read-models/vehicle-itinerary.read-model';
import { OperationSightingDetailsDto } from '../dtos/operation-sighting-details.dto';
import { SightingCarryOver } from './sighting-carry-over.read-model';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};
const seg = (
    p: Partial<ItinerarySegment> &
        Pick<ItinerarySegment, 'id' | 'operationNumber'>,
): ItinerarySegment => ({
    tripId: p.id,
    tripBlockId: `b-${p.id}`,
    operationId: `op-${p.operationNumber}`,
    startStationId: 'X',
    endStationId: 'Y',
    startSeconds: 0,
    endSeconds: 0,
    nextTripOperationListId: null,
    ...p,
});
const day = '2026-10-12';
const sighting = (
    id: string,
    operationNumber: string,
    formationNumber: string,
    hhmm: string,
) =>
    ({
        id,
        operationSightingId: id,
        operationId: `op-${operationNumber}`,
        sightingTime: dayjs(`${day} ${hhmm}`).toDate(),
        operation: { operationId: `op-${operationNumber}`, operationNumber },
        formation: { formationId: `f-${formationNumber}`, formationNumber },
    }) as unknown as OperationSightingDetailsDto;

// 海老名: 11K（〜8:22）→ 12K（8:30〜）
const ebina = VehicleItineraryReadModel.create([
    seg({
        id: 'k11',
        operationNumber: '11K',
        startSeconds: t('06:00'),
        endSeconds: t('08:22'),
        nextTripOperationListId: 'k12',
    }),
    seg({
        id: 'k12',
        operationNumber: '12K',
        startSeconds: t('08:30'),
        endSeconds: t('20:00'),
    }),
]);
// 赤羽岩淵: 朝の 02K（P）は 18:32 から 18K、18:32 以降の 02K は別の車両（Q）
const akabane = VehicleItineraryReadModel.create([
    seg({
        id: 'P02',
        operationNumber: '02K',
        startSeconds: t('06:00'),
        endSeconds: t('07:00'),
    }),
    seg({
        id: 'B02',
        tripBlockId: 'bB',
        operationNumber: '02K',
        endStationId: 'ak',
        startSeconds: t('18:10'),
        endSeconds: t('18:32'),
    }),
    seg({
        id: 'B18',
        tripBlockId: 'bB',
        operationNumber: '18K',
        startStationId: 'ak',
        startSeconds: t('18:32'),
        endSeconds: t('19:40'),
    }),
    seg({
        id: 'A18',
        tripBlockId: 'bA',
        operationNumber: '18K',
        endStationId: 'ak',
        startSeconds: t('17:00'),
        endSeconds: t('18:32'),
    }),
    seg({
        id: 'A02',
        tripBlockId: 'bA',
        operationNumber: '02K',
        startStationId: 'ak',
        startSeconds: t('18:32'),
        endSeconds: t('18:50'),
    }),
]);
const at = (hhmm: string) => dayjs(`${day} ${hhmm}`);
/** 運用カードの戻り値から 'unsighted' を外して読む（型だけ） */
const hit = <T>(r: T) => r as Exclude<T, 'unsighted'>;

describe('SightingCarryOver.resolveForOperation', () => {
    it('11K で目撃された編成は 12K でも目撃扱い・元の運番を添える', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '11K', '10701', '07:00')],
            operationNumber: '12K',
            searchTime: at('09:00'),
        });
        expect(hit(r)?.sighting.id).toBe('s1');
        expect(hit(r)?.sightedAsOperation).toEqual({
            operationId: 'op-11K',
            operationNumber: '11K',
        });
    });
    it('12K で目撃された編成は 11K でも目撃扱い（逆向き）', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '12K', '10701', '09:00')],
            operationNumber: '11K',
            searchTime: at('09:30'),
        });
        expect(hit(r)?.sightedAsOperation?.operationNumber).toBe('12K');
    });
    it('同じ編成がその運番でも目撃されていれば、より新しい別の運番の目撃より直接の目撃を返す', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [
                sighting('s0', '11K', '10701', '07:00'),
                sighting('s1', '12K', '10701', '08:02'),
            ],
            operationNumber: '11K',
            searchTime: at('13:00'),
        });
        expect(hit(r)?.sighting.id).toBe('s0');
        expect(hit(r)?.sightedAsOperation).toBeNull();
    });
    it('その運番の直接の目撃が無ければ、11K を走っている時刻の目撃でも入力された運番を添える', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '12K', '10701', '08:02')],
            operationNumber: '11K',
            searchTime: at('13:00'),
        });
        expect(hit(r)?.sighting.id).toBe('s1');
        expect(hit(r)?.sightedAsOperation?.operationNumber).toBe('12K');
    });
    it('直接の目撃には元の運番を付けない', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '12K', '10701', '09:00')],
            operationNumber: '12K',
            searchTime: at('09:30'),
        });
        expect(hit(r)?.sightedAsOperation).toBeNull();
    });
    it('朝の 02K の目撃は 18:32 以降の 18K に出て、18:32 以降の 02K は行程に実目撃が無い（unsighted）', () => {
        const sightings = [sighting('s1', '02K', '10701', '06:30')];
        expect(
            hit(
                SightingCarryOver.create(akabane).resolveForOperation({
                    sightings,
                    operationNumber: '18K',
                    searchTime: at('19:00'),
                }),
            )?.sighting.id,
        ).toBe('s1');
        expect(
            SightingCarryOver.create(akabane).resolveForOperation({
                sightings,
                operationNumber: '02K',
                searchTime: at('18:40'),
            }),
        ).toBe('unsighted');
    });
    it('その枠の実目撃は、ほかの枠のもっと新しい目撃より優先する（切替③）', () => {
        const sightings = [
            sighting('s2', '12K', '10702', '09:00'),
            sighting('s1', '11K', '10701', '07:00'),
        ];
        expect(
            hit(
                SightingCarryOver.create(ebina).resolveForOperation({
                    sightings,
                    operationNumber: '11K',
                    searchTime: at('09:30'),
                }),
            )?.sighting.id,
        ).toBe('s1');
    });
    it('その編成があとで別の行程表で目撃されていれば追い出されている', () => {
        const sightings = [
            sighting('s2', '02K', '10701', '06:30'),
            sighting('s1', '11K', '10701', '06:10'),
        ];
        const both = VehicleItineraryReadModel.create([
            ...ebina.segments(),
            ...akabane.segments(),
        ]);
        expect(
            SightingCarryOver.create(both).resolveForOperation({
                sightings,
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBeNull();
    });
    it('検索時刻より後の目撃は使わない', () => {
        expect(
            SightingCarryOver.create(ebina).resolveForOperation({
                sightings: [sighting('s1', '11K', '10701', '10:00')],
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBe('unsighted');
    });
    it('今日の区間が無い運番は undefined（今の判定へ落とす）', () => {
        expect(
            SightingCarryOver.create(ebina).resolveForOperation({
                sightings: [],
                operationNumber: '99X',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
});

describe('SightingCarryOver.resolveForFormation', () => {
    it('11K で目撃された編成は、9:00 には 12K にいる', () => {
        const r = SightingCarryOver.create(ebina).resolveForFormation({
            sightings: [sighting('s1', '11K', '10701', '07:00')],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sightedAsOperation?.operationNumber).toBe('11K');
    });
    it('いまの運番でも目撃されていれば、より新しい別の運番の目撃より直接の目撃を返す', () => {
        const r = SightingCarryOver.create(ebina).resolveForFormation({
            sightings: [
                sighting('s1', '12K', '10701', '08:40'),
                sighting('s2', '11K', '10701', '08:50'),
            ],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sighting.id).toBe('s1');
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('いまの運番の直接の目撃が無ければ、入力された運番を添える', () => {
        const r = SightingCarryOver.create(ebina).resolveForFormation({
            sightings: [sighting('s2', '11K', '10701', '08:50')],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sightedAsOperation?.operationNumber).toBe('11K');
    });
    it('同じ行程表でほかの編成があとから目撃されていれば追い出されている', () => {
        const sightings = [
            sighting('s2', '12K', '10702', '09:00'),
            sighting('s1', '11K', '10701', '07:00'),
        ];
        expect(
            SightingCarryOver.create(ebina).resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('09:30'),
            }),
        ).toBeNull();
    });
    it('今日の目撃が無ければ undefined（今の判定へ落とす）', () => {
        expect(
            SightingCarryOver.create(ebina).resolveForFormation({
                sightings: [],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
});

const operations = [
    { operationId: 'op-11K', operationNumber: '11K' },
    { operationId: 'op-12K', operationNumber: '12K' },
] as never;

describe('SightingCarryOver.buildCarried', () => {
    it('11K の目撃から、12K の引き継いだ目撃を作る', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [sighting('a', '11K', '10701', '07:00')],
            operations,
        });
        expect(out).toEqual([
            expect.objectContaining({
                id: 'a#12K',
                operationId: 'op-12K',
                sightedAsOperation: {
                    operationId: 'op-11K',
                    operationNumber: '11K',
                },
            }),
        ]);
    });
    it('11K を走っている時刻に 12K と入力された目撃から作る 11K の目撃にも、入力された運番を添える', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [sighting('a', '12K', '10701', '08:02')],
            operations,
        });
        expect(out).toEqual([
            expect.objectContaining({
                id: 'a#11K',
                operationId: 'op-11K',
                sightedAsOperation: {
                    operationId: 'op-12K',
                    operationNumber: '12K',
                },
            }),
        ]);
    });
    it('引き継いだ目撃は元とは別の operationSightingId を持つ', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [sighting('a', '11K', '10701', '07:00')],
            operations,
        });
        expect(out[0].operationSightingId).toBe('a#12K');
    });
    it('同じ日に同じ編成が直接目撃されている運用には作らない', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [
                sighting('a', '11K', '10701', '07:00'),
                sighting('b', '12K', '10701', '09:00'),
            ],
            operations,
        });
        expect(out).toEqual([]);
    });
});

// 18K（〜8:52）→ 17K（9:00〜17:02）→ 18K（17:09〜）。2026-10-13 の平日ダイヤの 3122
const back18 = VehicleItineraryReadModel.create([
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
const operationsBack = [
    { operationId: 'op-17K', operationNumber: '17K' },
    { operationId: 'op-18K', operationNumber: '18K' },
] as never;

describe('SightingCarryOver.buildCarried（運番が戻る行程）', () => {
    it('朝の 18K の目撃から、17K と戻った後の 18K の引き継いだ目撃を作る', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [sighting('a', '18K', '3122', '05:09')],
            operations: operationsBack,
        });
        expect(out).toEqual([
            expect.objectContaining({
                id: 'a#17K',
                operationId: 'op-17K',
                sightedAsOperation: {
                    operationId: 'op-18K',
                    operationNumber: '18K',
                },
            }),
            expect.objectContaining({
                id: 'a#18K#2',
                operationSightingId: 'a#18K#2',
                operationId: 'op-18K',
                sightedAsOperation: {
                    operationId: 'op-18K',
                    operationNumber: '18K',
                },
            }),
        ]);
    });
    it('17K の目撃から、前後の 18K を 2 つ作る', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [sighting('a', '17K', '3122', '10:00')],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['a#18K', 'a#18K#2']);
    });
    it('戻った後の 18K が直接目撃されていれば、そこには作らない', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [
                sighting('a', '18K', '3122', '05:09'),
                sighting('b', '18K', '3122', '21:07'),
            ],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['b#17K']);
    });
});

// 81（4:42〜23:47）は別の車両。77（7:14〜8:45）→ 87（8:59〜21:11）。2026-10-07 の 114
const swap = VehicleItineraryReadModel.create([
    seg({
        id: 'x81',
        operationNumber: '81',
        startSeconds: t('04:42'),
        endSeconds: t('23:47'),
    }),
    seg({
        id: 'y77',
        operationNumber: '77',
        startSeconds: t('07:14'),
        endSeconds: t('08:45'),
        nextTripOperationListId: 'y87',
    }),
    seg({
        id: 'y87',
        operationNumber: '87',
        startSeconds: t('08:59'),
        endSeconds: t('21:11'),
    }),
]);
const operationsSwap = [
    { operationId: 'op-77', operationNumber: '77' },
    { operationId: 'op-81', operationNumber: '81' },
    { operationId: 'op-87', operationNumber: '87' },
] as never;

describe('SightingCarryOver.buildCarried（別の行程での目撃と時刻が重なる）', () => {
    it('77 を受け持つ時間帯から 87 の目撃までの間に 81 で目撃されていれば、77 は作らない', () => {
        const out = SightingCarryOver.create(swap).buildCarried({
            sightings: [
                sighting('a', '81', '114', '08:31'),
                sighting('b', '87', '114', '18:12'),
            ],
            operations: operationsSwap,
        });
        expect(out).toEqual([]);
    });
    it('81 の目撃が 77 を受け持つより前なら、77 を作る', () => {
        const out = SightingCarryOver.create(swap).buildCarried({
            sightings: [
                sighting('a', '81', '114', '06:00'),
                sighting('b', '87', '114', '18:12'),
            ],
            operations: operationsSwap,
        });
        expect(out.map((o) => o.id)).toEqual(['b#77']);
    });
    it('後ろの枠も同じ。元の目撃から枠の終わりまでに別の行程で目撃されていれば作らない', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [
                sighting('a', '18K', '3122', '05:09'),
                sighting('x', '99X', '3122', '12:00'),
            ],
            operations: operationsBack,
        });
        expect(out).toEqual([]);
    });
});

describe('SightingCarryOver.buildCarried（ほかの編成が同じ枠で目撃されている）', () => {
    it('10701 が 11K、10702 が 12K で目撃されていれば、どちらにも引き継ぎを作らない', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [
                sighting('a', '11K', '10701', '07:00'),
                sighting('b', '12K', '10702', '09:00'),
            ],
            operations,
        });
        expect(out).toEqual([]);
    });
    it('朝の 18K が 3122、戻った後の 18K が 3113 なら、17K は前から続く 3122 に作る', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [
                sighting('a', '18K', '3122', '05:09'),
                sighting('b', '18K', '3113', '21:07'),
            ],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['a#17K']);
    });
    it('取り合う編成がどちらも枠より後の目撃なら、早く目撃された編成に作る', () => {
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [
                sighting('a', '17K', '3122', '10:00'),
                sighting('b', '18K', '3113', '21:07'),
            ],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['a#18K']);
    });
    it('ほかの編成が別の枠で目撃されていても、取り合いにならない枠には作る', () => {
        // 3113 は 13:00 に別の行程（99X）で目撃されているので、3113 からは 17K を作らない
        const out = SightingCarryOver.create(back18).buildCarried({
            sightings: [
                sighting('a', '18K', '3122', '05:09'),
                sighting('x', '99X', '3113', '13:00'),
                sighting('b', '18K', '3113', '21:07'),
            ],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['a#17K']);
    });
});

describe('SightingCarryOver.orderOf', () => {
    it('行程の中では受け持つ順に並ぶ（引き継いだ目撃は自分の枠の始まり）', () => {
        const carry = SightingCarryOver.create(back18);
        const direct = sighting('a', '17K', '3122', '10:00');
        const sightings = [direct];
        const [before, after] = carry.buildCarried({
            sightings,
            operations: operationsBack,
        });
        expect(carry.orderOf(before, '18K', sightings)).toEqual([
            t('10:00'),
            t('05:08'),
        ]);
        expect(carry.orderOf(direct, '17K', sightings)).toEqual([
            t('10:00'),
            t('09:00'),
        ]);
        expect(carry.orderOf(after, '18K', sightings)).toEqual([
            t('10:00'),
            t('17:09'),
        ]);
    });
    it('行程が分からない目撃は目撃の時刻', () => {
        const s = sighting('a', '99X', '3122', '10:00');
        expect(SightingCarryOver.create(back18).orderOf(s, '99X', [s])).toEqual(
            [t('10:00'), t('10:00')],
        );
    });
    it('無効化した直接の目撃（sightings に無い）は、自分の時刻も行程に入った時刻に数える', () => {
        const valid = sighting('b', '17K', '3122', '10:00');
        const invalidated = sighting('a', '18K', '3122', '05:30');
        expect(
            SightingCarryOver.create(back18).orderOf(invalidated, '18K', [
                valid,
            ]),
        ).toEqual([t('05:30'), t('05:08')]);
    });
});

// 11K → 12K → 13K（決まり 2 を 2 回）
const chain3 = VehicleItineraryReadModel.create([
    seg({
        id: 'c11',
        operationNumber: '11K',
        startSeconds: t('06:00'),
        endSeconds: t('08:22'),
        nextTripOperationListId: 'c12',
    }),
    seg({
        id: 'c12',
        operationNumber: '12K',
        startSeconds: t('08:30'),
        endSeconds: t('12:00'),
        nextTripOperationListId: 'c13',
    }),
    seg({
        id: 'c13',
        operationNumber: '13K',
        startSeconds: t('12:30'),
        endSeconds: t('20:00'),
    }),
]);
const operations3 = [
    { operationId: 'op-11K', operationNumber: '11K' },
    { operationId: 'op-12K', operationNumber: '12K' },
    { operationId: 'op-13K', operationNumber: '13K' },
] as never;

describe('SightingCarryOver.resolveForOperation（境界）', () => {
    const carry = SightingCarryOver.create(ebina);
    it('検索時刻ちょうどの目撃は使う', () => {
        expect(
            hit(
                carry.resolveForOperation({
                    sightings: [sighting('s1', '11K', '10701', '09:00')],
                    operationNumber: '12K',
                    searchTime: at('09:00'),
                }),
            )?.sighting.id,
        ).toBe('s1');
    });
    it('目撃が無ければ unsighted（行程表はあるので undefined ではない）', () => {
        expect(
            carry.resolveForOperation({
                sightings: [],
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBe('unsighted');
    });
    it('別の行程表の目撃だけなら unsighted', () => {
        const both = VehicleItineraryReadModel.create([
            ...ebina.segments(),
            ...akabane.segments(),
        ]);
        expect(
            SightingCarryOver.create(both).resolveForOperation({
                sightings: [sighting('s1', '02K', '10701', '06:30')],
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBe('unsighted');
    });
    it('同じ行程の目撃が複数あれば、検索時刻までで最も新しいものを返す（入力の並びによらない）', () => {
        // 11K の直接の目撃が混ざると、そちらが優先される（別のテスト）ので、ここは 12K だけで並びを見る
        const old = sighting('old', '12K', '10701', '06:30');
        const recent = sighting('recent', '12K', '10701', '08:40');
        const later = sighting('later', '12K', '10701', '10:00');
        for (const sightings of [
            [old, recent, later],
            [later, recent, old],
        ]) {
            expect(
                hit(
                    carry.resolveForOperation({
                        sightings,
                        operationNumber: '11K',
                        searchTime: at('09:00'),
                    }),
                )?.sighting.id,
            ).toBe('recent');
        }
    });
    it('同じ編成の最新の目撃が同じ行程表の中なら追い出されない', () => {
        expect(
            hit(
                carry.resolveForOperation({
                    sightings: [
                        sighting('s2', '12K', '10701', '08:40'),
                        sighting('s1', '11K', '10701', '07:00'),
                    ],
                    operationNumber: '12K',
                    searchTime: at('09:00'),
                }),
            )?.sighting.id,
        ).toBe('s2');
    });
    it('その枠に実目撃があれば、あとでほかの枠に出た編成に取られない（切替③）', () => {
        // 10701 は 07:00 に 11K で、10702 は 09:00 に 12K で目撃。11K には実目撃の 10701 が出る
        const r = carry.resolveForOperation({
            sightings: [
                sighting('s1', '11K', '10701', '07:00'),
                sighting('s2', '12K', '10702', '09:00'),
            ],
            operationNumber: '11K',
            searchTime: at('09:30'),
        });
        expect(hit(r)?.sighting.formation?.formationNumber).toBe('10701');
        expect(hit(r)?.sightedAsOperation).toBeNull();
    });
    it('運番が無い目撃は、行程が判定できず無視される', () => {
        const noOp = {
            ...sighting('s', '11K', '10701', '07:00'),
            operation: null,
        };
        expect(
            carry.resolveForOperation({
                sightings: [noOp],
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBe('unsighted');
    });
    it('編成の無い目撃でも、直接なら返す', () => {
        const noFormation = {
            ...sighting('s', '12K', '10701', '09:00'),
            formation: null,
        };
        const r = carry.resolveForOperation({
            sightings: [noFormation],
            operationNumber: '12K',
            searchTime: at('09:30'),
        });
        expect(hit(r)?.sighting.id).toBe('s');
        expect(hit(r)?.sightedAsOperation).toBeNull();
    });
    it('3 つの運番がつながる行程では、端の運番どうしにも引き継ぐ', () => {
        const r = SightingCarryOver.create(chain3).resolveForOperation({
            sightings: [sighting('s', '11K', '10701', '07:00')],
            operationNumber: '13K',
            searchTime: at('13:00'),
        });
        expect(hit(r)?.sightedAsOperation?.operationNumber).toBe('11K');
    });
});

describe('SightingCarryOver.resolveForFormation（境界）', () => {
    const carry = SightingCarryOver.create(ebina);
    it('直接目撃された運番にいれば、sightedAsOperation は付かない', () => {
        const r = carry.resolveForFormation({
            sightings: [sighting('s1', '12K', '10701', '09:00')],
            formationNumber: '10701',
            searchTime: at('09:30'),
        });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('11K の終点到着後 12K の出発前（08:22〜08:30）は、直前に終わった 11K にいる', () => {
        const sightings = [sighting('s1', '11K', '10701', '07:00')];
        expect(
            carry.resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('08:25'),
            })?.operationNumber,
        ).toBe('11K');
    });
    it('12K の出発の時刻ちょうどに 12K へ替わる', () => {
        const sightings = [sighting('s1', '11K', '10701', '07:00')];
        expect(
            carry.resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('08:30'),
            })?.operationNumber,
        ).toBe('12K');
        expect(
            carry.resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('08:29'),
            })?.operationNumber,
        ).toBe('11K');
    });
    it('検索時刻より後の目撃しか無ければ undefined', () => {
        expect(
            carry.resolveForFormation({
                sightings: [sighting('s1', '11K', '10701', '10:00')],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
    it('ほかの編成の目撃しか無ければ undefined', () => {
        expect(
            carry.resolveForFormation({
                sightings: [sighting('s1', '11K', '10702', '07:00')],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
    it('運番が無い目撃は undefined（今の判定へ落とす）', () => {
        const noOp = {
            ...sighting('s', '11K', '10701', '07:00'),
            operation: null,
        };
        expect(
            carry.resolveForFormation({
                sightings: [noOp],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
    it('今日の区間に無い運番で目撃された編成は undefined', () => {
        expect(
            carry.resolveForFormation({
                sightings: [sighting('s', '99X', '10701', '07:00')],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
    it('同じ行程の最新の目撃がその編成なら追い出されない', () => {
        const r = carry.resolveForFormation({
            sightings: [
                sighting('s1', '11K', '10701', '07:00'),
                sighting('s2', '12K', '10701', '08:40'),
                sighting('s0', '11K', '10702', '06:30'),
            ],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.sighting.id).toBe('s2');
        expect(r?.operationNumber).toBe('12K');
    });
    it('その編成が別の行程表で、より新しく目撃されていれば、新しい方の行程で答える', () => {
        const both = VehicleItineraryReadModel.create([
            ...ebina.segments(),
            ...akabane.segments(),
        ]);
        const r = SightingCarryOver.create(both).resolveForFormation({
            sightings: [
                sighting('s2', '02K', '10701', '06:30'),
                sighting('s1', '11K', '10701', '06:10'),
            ],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.sighting.id).toBe('s2');
        expect(r?.operationNumber).toBe('02K');
    });
    it('3 つの運番がつながる行程では、時刻に応じた運番を返す', () => {
        const c = SightingCarryOver.create(chain3);
        const sightings = [sighting('s', '11K', '10701', '07:00')];
        expect(
            c.resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('10:00'),
            })?.operationNumber,
        ).toBe('12K');
        expect(
            c.resolveForFormation({
                sightings,
                formationNumber: '10701',
                searchTime: at('13:00'),
            })?.operationNumber,
        ).toBe('13K');
    });
});

describe('SightingCarryOver.buildCarried（境界）', () => {
    const carry = SightingCarryOver.create(ebina);
    it('目撃が無ければ空', () => {
        expect(carry.buildCarried({ sightings: [], operations })).toEqual([]);
    });
    it('行程に運番が 1 つしか無ければ作らない', () => {
        const solo = VehicleItineraryReadModel.create([
            seg({
                id: 'a',
                operationNumber: '11K',
                startSeconds: 0,
                endSeconds: 10,
            }),
        ]);
        expect(
            SightingCarryOver.create(solo).buildCarried({
                sightings: [sighting('a', '11K', '1', '00:00')],
                operations,
            }),
        ).toEqual([]);
    });
    it('3 つの運番がつながる行程では、残り 2 つの運番ぶんを作る', () => {
        const out = SightingCarryOver.create(chain3).buildCarried({
            sightings: [sighting('a', '12K', '10701', '09:00')],
            operations: operations3,
        });
        expect(out.map((o) => o.id).sort()).toEqual(['a#11K', 'a#13K']);
        expect(out.map((o) => o.operationId).sort()).toEqual([
            'op-11K',
            'op-13K',
        ]);
    });
    it('同じ編成が同じ運番で 2 回目撃されていても、引き継ぎは 1 件だけ作る', () => {
        const out = carry.buildCarried({
            sightings: [
                sighting('a', '11K', '10701', '06:30'),
                sighting('b', '11K', '10701', '07:30'),
            ],
            operations,
        });
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe('b#12K');
    });
    it('operations に無い運番へは作らない', () => {
        const out = carry.buildCarried({
            sightings: [sighting('a', '11K', '10701', '07:00')],
            operations: [{ operationId: 'op-11K', operationNumber: '11K' }],
        });
        expect(out).toEqual([]);
    });
    it('編成の無い目撃からは作らない', () => {
        const noFormation = {
            ...sighting('a', '11K', '10701', '07:00'),
            formation: null,
        };
        expect(
            carry.buildCarried({ sightings: [noFormation], operations }),
        ).toEqual([]);
    });
    it('運番の無い目撃からは作らない', () => {
        const noOp = {
            ...sighting('a', '11K', '10701', '07:00'),
            operation: null,
        };
        expect(carry.buildCarried({ sightings: [noOp], operations })).toEqual(
            [],
        );
    });
    it('今日の区間に無い運番の目撃からは作らない', () => {
        expect(
            carry.buildCarried({
                sightings: [sighting('a', '99X', '10701', '07:00')],
                operations,
            }),
        ).toEqual([]);
    });
    it('引き継いだ目撃は、元の目撃の時刻・編成を保ち、運用を引き継ぎ先に差し替える', () => {
        const original = sighting('a', '11K', '10701', '07:00');
        const [carried] = carry.buildCarried({
            sightings: [original],
            operations,
        });
        expect(carried.sightingTime).toEqual(original.sightingTime);
        expect(carried.formation).toEqual(original.formation);
        expect(carried.operation).toEqual(operations[1]);
        expect(carried.operationSightingId).toBe('a#12K');
        expect(original.id).toBe('a');
    });
    it('同じ編成があとで別の行程表で目撃されていれば、その後の枠には引き継ぎを作らない', () => {
        const both = VehicleItineraryReadModel.create([
            ...ebina.segments(),
            ...akabane.segments(),
        ]);
        const out = SightingCarryOver.create(both).buildCarried({
            sightings: [
                sighting('a', '11K', '10701', '06:10'),
                sighting('b', '02K', '10701', '06:30'),
            ],
            operations: [
                ...(operations as unknown as {
                    operationId: string;
                    operationNumber: string;
                }[]),
                { operationId: 'op-02K', operationNumber: '02K' },
                { operationId: 'op-18K', operationNumber: '18K' },
            ],
        });
        expect(out.some((o) => o.id === 'a#12K')).toBe(false);
    });
});

describe('SightingCarryOver.resolveForFormation（編成の無い目撃）', () => {
    it('同じ行程の最新の目撃に編成が無ければ、その編成は追い出された扱いで null', () => {
        const noFormation = {
            ...sighting('s2', '12K', '10701', '09:00'),
            formation: null,
        };
        expect(
            SightingCarryOver.create(ebina).resolveForFormation({
                sightings: [
                    sighting('s1', '11K', '10701', '07:00'),
                    noFormation,
                ],
                formationNumber: '10701',
                searchTime: at('09:30'),
            }),
        ).toBeNull();
    });
    it('編成の無い目撃は、どの編成の目撃としても数えない', () => {
        const noFormation = {
            ...sighting('s', '11K', '10701', '07:00'),
            formation: undefined,
        };
        expect(
            SightingCarryOver.create(ebina).resolveForFormation({
                sightings: [noFormation],
                formationNumber: '10701',
                searchTime: at('09:00'),
            }),
        ).toBeUndefined();
    });
});

describe('SightingCarryOver（枠の割り当て・spec 4 章）', () => {
    // back18: X=18K（X1 5:08〜8:52）→ Y=17K（9:00〜17:02）→ X（X2 17:09〜21:22）
    const op = (
        sightings: OperationSightingDetailsDto[],
        operationNumber: string,
        hhmm: string,
    ) =>
        SightingCarryOver.create(back18).resolveForOperation({
            sightings,
            operationNumber,
            searchTime: at(hhmm),
        });
    const fm = (
        sightings: OperationSightingDetailsDto[],
        formationNumber: string,
        hhmm: string,
    ) =>
        SightingCarryOver.create(back18).resolveForFormation({
            sightings,
            formationNumber,
            searchTime: at(hhmm),
        });
    const past = (sightings: OperationSightingDetailsDto[]) =>
        SightingCarryOver.create(back18)
            .buildCarried({ sightings, operations: operationsBack })
            .map((o) => [
                o.formation?.formationNumber,
                o.operation?.operationNumber,
            ]);
    const who = (r: ReturnType<typeof op>) =>
        r && typeof r === 'object'
            ? `${r.sighting.formation?.formationNumber}${r.sightedAsOperation ? '?' : ''}`
            : r;
    const fmWho = (r: ReturnType<typeof fm>) =>
        r ? `${r.operationNumber}${r.sightedAsOperation ? '?' : ''}` : r;

    it('切替①（X:A）: Y は A?。編成カードは Y の間 17K?', () => {
        const s = [sighting('a', '18K', 'A', '06:00')];
        expect(who(op(s, '17K', '10:00'))).toBe('A?');
        expect(fmWho(fm(s, 'A', '10:00'))).toBe('17K?');
        expect(past(s)).toEqual([
            ['A', '17K'],
            ['A', '18K'],
        ]);
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
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('b', '17K', 'B', '10:00'),
        ];
        expect(who(op(s, '18K', '10:30'))).toBe('A');
        expect(who(op(s, '17K', '10:30'))).toBe('B');
        expect(fmWho(fm(s, 'A', '08:00'))).toBe('18K');
        expect(fm(s, 'A', '10:30')).toBeNull();
        expect(fmWho(fm(s, 'B', '10:30'))).toBe('17K');
    });
    it('戻り①（X1:A、Y:B）: X は X1・Y の間 A、X2 の間 B?。B は X2 の間 18K?', () => {
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('b', '17K', 'B', '10:00'),
        ];
        expect(who(op(s, '18K', '12:00'))).toBe('A');
        expect(who(op(s, '18K', '18:00'))).toBe('B?');
        expect(fm(s, 'A', '18:00')).toBeNull();
        expect(fmWho(fm(s, 'B', '18:00'))).toBe('18K?');
        expect(past(s)).toEqual([['B', '18K']]);
    });
    it('戻り①: X2 の推測の元は 17K（sightedAsOperation は元の目撃の運番）', () => {
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('b', '17K', 'B', '10:00'),
        ];
        const r = op(s, '18K', '18:00');
        expect(
            r && typeof r === 'object' && r.sightedAsOperation?.operationNumber,
        ).toBe('17K');
    });
    it('戻り②（X1:A、X2:B）: Y は A?、A は X2 が始まったら不明', () => {
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('b', '18K', 'B', '17:30'),
        ];
        expect(who(op(s, '17K', '18:00'))).toBe('A?');
        expect(who(op(s, '18K', '18:00'))).toBe('B');
        expect(fmWho(fm(s, 'A', '12:00'))).toBe('17K?');
        expect(fm(s, 'A', '18:00')).toBeNull();
        expect(past(s)).toEqual([['A', '17K']]);
    });
    it('戻り（X1:A だけ）: Y も X2 も A?。X2 の推測の元は 18K', () => {
        const s = [sighting('a', '18K', 'A', '05:09')];
        expect(who(op(s, '18K', '18:00'))).toBe('A?');
        expect(past(s)).toEqual([
            ['A', '17K'],
            ['A', '18K'],
        ]);
    });
    it('移動: 朝 81、昼 87 の行程の目撃より前の 77 は付けない', () => {
        const s = [
            sighting('a', '81', '114', '08:31'),
            sighting('b', '87', '114', '18:12'),
        ];
        expect(
            SightingCarryOver.create(swap).buildCarried({
                sightings: s,
                operations: operationsSwap,
            }),
        ).toEqual([]);
    });
    it('休車: 朝 X、昼 100 なら、昼をまたぐ Y は付けない（ほかに候補が無ければ不明）', () => {
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('x', '100', 'A', '12:00'),
        ];
        expect(op(s, '17K', '13:00')).toBeNull();
        expect(fm(s, 'A', '13:00')).toBeUndefined();
    });
    it('先回り: 16:23 の 18K は X2 の実目撃。X1 は A?', () => {
        const s = [
            sighting('a', '17K', 'A', '16:23'),
            sighting('b', '18K', 'A', '16:23'),
        ];
        expect(past(s)).toEqual([['A', '18K']]);
        const carried = SightingCarryOver.create(back18).buildCarried({
            sightings: s,
            operations: operationsBack,
        });
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
        const r1 = carry.resolveForOperation({
            sightings: s,
            operationNumber: '02K',
            searchTime: at('18:20'),
        });
        expect(r1 && typeof r1 === 'object' && r1.sighting.id).toBe('a');
        const r2 = carry.resolveForOperation({
            sightings: s,
            operationNumber: '18K',
            searchTime: at('18:40'),
        });
        expect(
            r2 &&
                typeof r2 === 'object' &&
                r2.sightedAsOperation?.operationNumber,
        ).toBe('02K');
    });
    it('検索時刻の選び方は変えない: 06:30 の 02K の編成は、12:00 の 02K に出る', () => {
        const s = [sighting('a', '02K', 'A', '06:30')];
        const r = SightingCarryOver.create(akabane).resolveForOperation({
            sightings: s,
            operationNumber: '02K',
            searchTime: at('12:00'),
        });
        expect(r && typeof r === 'object' && r.sighting.id).toBe('a');
    });
    it('同じ枠に 2 編成: 運用カードは新しいほう、推測は新しいほうから続く', () => {
        const s = [
            sighting('a', '18K', 'A', '05:30'),
            sighting('b', '18K', 'B', '06:30'),
        ];
        expect(who(op(s, '18K', '07:00'))).toBe('B');
        expect(who(op(s, '17K', '10:00'))).toBe('B?');
    });
    it('無効化も含めるとき、推測に載せる目撃は有効な目撃を優先する（無効化だけが根拠のときに限り無効化を写す）', () => {
        const invalidated = (s: OperationSightingDetailsDto) =>
            ({
                ...s,
                invalidation: { id: `inv-${s.id}` },
            }) as unknown as OperationSightingDetailsDto;
        const valid = sighting('a', '18K', 'A', '06:00');
        const later = invalidated(sighting('b', '18K', 'A', '07:00'));
        const carry = SightingCarryOver.create(back18);
        const out = carry.buildCarried({
            sightings: [valid, later],
            operations: operationsBack,
        });
        expect(out.map((o) => o.id)).toEqual(['a#17K', 'a#18K#2']);
        expect(out.every((o) => !o.invalidation)).toBe(true);
        const only = carry.buildCarried({
            sightings: [later],
            operations: operationsBack,
        });
        expect(only.map((o) => o.invalidation)).toEqual([
            { id: 'inv-b' },
            { id: 'inv-b' },
        ]);
    });
    it('同じ時刻に 2 編成: 入力の並びによらず、投稿の新しいほうが勝つ', () => {
        const posted = (s: OperationSightingDetailsDto, hhmm: string) =>
            ({
                ...s,
                createdAt: at(hhmm).toDate(),
            }) as OperationSightingDetailsDto;
        const a = posted(sighting('a', '18K', 'A', '06:00'), '06:05');
        const b = posted(sighting('b', '18K', 'B', '06:00'), '06:01');
        for (const s of [
            [a, b],
            [b, a],
        ]) {
            expect(who(op(s, '18K', '07:00'))).toBe('A');
            expect(who(op(s, '17K', '10:00'))).toBe('A?');
        }
    });
    it('同じ時刻・同じ投稿時刻なら id で決める（入力の並びによらない）', () => {
        const a = sighting('a', '18K', 'A', '06:00');
        const b = sighting('b', '18K', 'B', '06:00');
        for (const s of [
            [a, b],
            [b, a],
        ]) {
            expect(who(op(s, '18K', '07:00'))).toBe('B');
        }
    });
    it('検索時刻より後の目撃は使わない', () => {
        const s = [
            sighting('a', '18K', 'A', '06:00'),
            sighting('b', '17K', 'B', '10:00'),
        ];
        expect(who(op(s, '17K', '09:30'))).toBe('A?');
    });
    it('割り当ての使い回し: 同じ行程表なら同じインスタンス', () => {
        expect(SightingCarryOver.create(back18)).toBe(
            SightingCarryOver.create(back18),
        );
    });
    it('割り当ての使い回し: 同じ目撃の配列・同じ検索時刻なら作り直さず、検索時刻が違えば作り直す', () => {
        const build = vi.spyOn(
            SightingCarryOver.prototype as unknown as {
                buildAssignments: () => unknown;
            },
            'buildAssignments',
        );
        try {
            const s = [
                sighting('a', '18K', 'A', '06:00'),
                sighting('b', '17K', 'B', '10:00'),
            ];
            expect(who(op(s, '17K', '09:30'))).toBe('A?');
            expect(who(op(s, '18K', '09:30'))).toBe('A');
            expect(build).toHaveBeenCalledTimes(1);
            expect(who(op(s, '17K', '10:30'))).toBe('B');
            expect(build).toHaveBeenCalledTimes(2);
        } finally {
            build.mockRestore();
        }
    });
});

describe('SightingCarryOver（テストで押さえていなかった形）', () => {
    const sightingAt = (
        id: string,
        operationNumber: string,
        formationNumber: string,
        datetime: string,
    ) =>
        ({
            ...sighting(id, operationNumber, formationNumber, '00:00'),
            sightingTime: dayjs(datetime).toDate(),
        }) as OperationSightingDetailsDto;
    const operationsOf = (...numbers: string[]) =>
        numbers.map((n) => ({
            operationId: `op-${n}`,
            operationNumber: n,
        }));
    const formationOf = (r: unknown) =>
        r && typeof r === 'object'
            ? `${(r as { sighting: OperationSightingDetailsDto }).sighting.formation?.formationNumber}${(r as { sightedAsOperation: unknown }).sightedAsOperation ? '?' : ''}`
            : r;

    describe('深夜（0:00〜4:00）', () => {
        // X（22:00〜24:30）→ Y（24:40〜25:30）。24 時以降は翌日の 0 時台
        const night = VehicleItineraryReadModel.create([
            seg({
                id: 'nX',
                operationNumber: '51K',
                startSeconds: t('22:00'),
                endSeconds: t('24:30'),
                nextTripOperationListId: 'nY',
            }),
            seg({
                id: 'nY',
                operationNumber: '52K',
                startSeconds: t('24:40'),
                endSeconds: t('25:30'),
            }),
        ]);
        it('0 時台の目撃は前の鉄道日の 24 時台の区間に付き、続く枠に推測が出る', () => {
            const s = [sightingAt('a', '51K', 'A', '2026-10-13 00:10')];
            const carry = SightingCarryOver.create(night);
            expect(
                formationOf(
                    carry.resolveForOperation({
                        sightings: s,
                        operationNumber: '52K',
                        searchTime: dayjs('2026-10-13 01:00'),
                    }),
                ),
            ).toBe('A?');
            expect(
                carry
                    .buildCarried({
                        sightings: s,
                        operations: operationsOf('51K', '52K') as never,
                    })
                    .map((o) => o.id),
            ).toEqual(['a#52K']);
        });
        it('25 時台の目撃から、前の 24 時台の枠を推測する', () => {
            const s = [sightingAt('b', '52K', 'A', '2026-10-13 01:00')];
            expect(
                SightingCarryOver.create(night)
                    .buildCarried({
                        sightings: s,
                        operations: operationsOf('51K', '52K') as never,
                    })
                    .map((o) => o.id),
            ).toEqual(['b#51K']);
        });
    });

    describe('同じ編成が行程 I → 別の行程 J → また I', () => {
        // I: P（06:00〜09:00）→ Q（09:10〜12:00）→ R（12:10〜20:00）→ T（20:10〜22:00）。J: S（08:00〜20:00）
        const revisit = VehicleItineraryReadModel.create([
            seg({
                id: 'iP',
                operationNumber: '61K',
                startSeconds: t('06:00'),
                endSeconds: t('09:00'),
                nextTripOperationListId: 'iQ',
            }),
            seg({
                id: 'iQ',
                operationNumber: '62K',
                startSeconds: t('09:10'),
                endSeconds: t('12:00'),
                nextTripOperationListId: 'iR',
            }),
            seg({
                id: 'iR',
                operationNumber: '63K',
                startSeconds: t('12:10'),
                endSeconds: t('20:00'),
                nextTripOperationListId: 'iT',
            }),
            seg({
                id: 'iT',
                operationNumber: '64K',
                startSeconds: t('20:10'),
                endSeconds: t('22:00'),
            }),
            seg({
                id: 'jS',
                operationNumber: '71K',
                startSeconds: t('08:00'),
                endSeconds: t('20:00'),
            }),
        ]);
        const s = [
            sighting('p', '61K', 'A', '07:00'),
            sighting('j', '71K', 'A', '10:00'),
            sighting('r', '63K', 'A', '15:00'),
        ];
        const carry = SightingCarryOver.create(revisit);
        it('J にいた時間帯をはさむ枠（Q）は推測せず不明、I に戻った後の枠（T）は推測する', () => {
            expect(
                carry.resolveForOperation({
                    sightings: s,
                    operationNumber: '62K',
                    searchTime: at('11:00'),
                }),
            ).toBeNull();
            expect(
                formationOf(
                    carry.resolveForOperation({
                        sightings: s,
                        operationNumber: '64K',
                        searchTime: at('21:00'),
                    }),
                ),
            ).toBe('A?');
            expect(
                carry
                    .buildCarried({
                        sightings: s,
                        operations: operationsOf(
                            '61K',
                            '62K',
                            '63K',
                            '64K',
                            '71K',
                        ) as never,
                    })
                    .map((o) => o.id),
            ).toEqual(['r#64K']);
        });
        it('過去の運用の並びは I（1 回目）→ J → I（2 回目）の順', () => {
            const [carried] = carry.buildCarried({
                sightings: s,
                operations: operationsOf(
                    '61K',
                    '62K',
                    '63K',
                    '64K',
                    '71K',
                ) as never,
            });
            const items: [OperationSightingDetailsDto, string][] = [
                [carried, '64K'],
                [s[2], '63K'],
                [s[1], '71K'],
                [s[0], '61K'],
            ];
            const sorted = items
                .map(([o, n]) => ({ o, k: carry.orderOf(o, n, s) }))
                .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1])
                .map(({ o }) => o.id);
            expect(sorted).toEqual(['p', 'j', 'r', 'r#64K']);
        });
    });

    it('輪になった行程（いちばん早い区間で切る）でも推測できる', () => {
        const loop = VehicleItineraryReadModel.create([
            seg({
                id: 'L1',
                operationNumber: '81K',
                startSeconds: t('06:00'),
                endSeconds: t('08:00'),
                nextTripOperationListId: 'L2',
            }),
            seg({
                id: 'L2',
                operationNumber: '82K',
                startSeconds: t('08:10'),
                endSeconds: t('20:00'),
                nextTripOperationListId: 'L1',
            }),
        ]);
        const s = [sighting('a', '81K', 'A', '07:00')];
        expect(
            formationOf(
                SightingCarryOver.create(loop).resolveForOperation({
                    sightings: s,
                    operationNumber: '82K',
                    searchTime: at('12:00'),
                }),
            ),
        ).toBe('A?');
    });
});
