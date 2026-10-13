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

describe('SightingCarryOver.resolveForOperation', () => {
    it('11K で目撃された編成は 12K でも目撃扱い・元の運番を添える', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '11K', '10701', '07:00')],
            operationNumber: '12K',
            searchTime: at('09:00'),
        });
        expect(r?.sighting.id).toBe('s1');
        expect(r?.sightedAsOperation).toEqual({
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
        expect(r?.sightedAsOperation?.operationNumber).toBe('12K');
    });
    it('11K を走っている時刻に 12K と入力された目撃は、11K では元の運番を付けない', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '12K', '10701', '08:02')],
            operationNumber: '11K',
            searchTime: at('13:00'),
        });
        expect(r?.sighting.id).toBe('s1');
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('直接の目撃には元の運番を付けない', () => {
        const r = SightingCarryOver.create(ebina).resolveForOperation({
            sightings: [sighting('s1', '12K', '10701', '09:00')],
            operationNumber: '12K',
            searchTime: at('09:30'),
        });
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('朝の 02K の目撃は 18:32 以降の 18K に出て、18:32 以降の 02K には出ない', () => {
        const sightings = [sighting('s1', '02K', '10701', '06:30')];
        expect(
            SightingCarryOver.create(akabane).resolveForOperation({
                sightings,
                operationNumber: '18K',
                searchTime: at('19:00'),
            })?.sighting.id,
        ).toBe('s1');
        expect(
            SightingCarryOver.create(akabane).resolveForOperation({
                sightings,
                operationNumber: '02K',
                searchTime: at('18:40'),
            }),
        ).toBeNull();
    });
    it('引き継いだ先でもっと新しい直接の目撃があればそちらが勝つ', () => {
        const sightings = [
            sighting('s2', '12K', '10702', '09:00'),
            sighting('s1', '11K', '10701', '07:00'),
        ];
        expect(
            SightingCarryOver.create(ebina).resolveForOperation({
                sightings,
                operationNumber: '11K',
                searchTime: at('09:30'),
            })?.sighting.id,
        ).toBe('s2');
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
        ).toBeNull();
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
    it('12K を走っている時刻に 11K と入力された目撃は、12K にいるとき元の運番を付けない', () => {
        const r = SightingCarryOver.create(ebina).resolveForFormation({
            sightings: [sighting('s1', '11K', '10701', '08:40')],
            formationNumber: '10701',
            searchTime: at('09:00'),
        });
        expect(r?.operationNumber).toBe('12K');
        expect(r?.sightedAsOperation).toBeNull();
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
    it('11K を走っている時刻に 12K と入力された目撃から作る 11K の目撃には、元の運番を付けない', () => {
        const out = SightingCarryOver.create(ebina).buildCarried({
            sightings: [sighting('a', '12K', '10701', '08:02')],
            operations,
        });
        expect(out).toEqual([
            expect.objectContaining({
                id: 'a#11K',
                operationId: 'op-11K',
                sightedAsOperation: null,
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

describe('SightingCarryOver.itineraryOfSighting', () => {
    it('目撃された時刻にその運番を受け持っていた区間の行程を返す', () => {
        const carry = SightingCarryOver.create(ebina);
        expect(
            carry.itineraryOfSighting(sighting('s', '11K', '1', '07:00')),
        ).toBe(ebina.itineraryOf('k11'));
    });
    it('運番が無い目撃は undefined', () => {
        const s = { ...sighting('s', '11K', '1', '07:00'), operation: null };
        expect(SightingCarryOver.create(ebina).itineraryOfSighting(s)).toBe(
            undefined,
        );
    });
    it('今日の区間に無い運番の目撃は undefined', () => {
        expect(
            SightingCarryOver.create(ebina).itineraryOfSighting(
                sighting('s', '99X', '1', '07:00'),
            ),
        ).toBeUndefined();
    });
    it('同じ運番でも、目撃の時刻で受け持っていた車両（行程）が替わる', () => {
        const carry = SightingCarryOver.create(akabane);
        const morning = carry.itineraryOfSighting(
            sighting('s1', '02K', '1', '06:30'),
        );
        const evening = carry.itineraryOfSighting(
            sighting('s2', '02K', '1', '18:40'),
        );
        expect(morning).toBeDefined();
        expect(evening).toBeDefined();
        expect(morning).not.toBe(evening);
    });
});

describe('SightingCarryOver.resolveForOperation（境界）', () => {
    const carry = SightingCarryOver.create(ebina);
    it('検索時刻ちょうどの目撃は使う', () => {
        expect(
            carry.resolveForOperation({
                sightings: [sighting('s1', '11K', '10701', '09:00')],
                operationNumber: '12K',
                searchTime: at('09:00'),
            })?.sighting.id,
        ).toBe('s1');
    });
    it('目撃が無ければ null（行程表はあるので undefined ではない）', () => {
        expect(
            carry.resolveForOperation({
                sightings: [],
                operationNumber: '12K',
                searchTime: at('09:00'),
            }),
        ).toBeNull();
    });
    it('別の行程表の目撃だけなら null', () => {
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
        ).toBeNull();
    });
    it('同じ行程の目撃が複数あれば、検索時刻までで最も新しいものを返す（入力の並びによらない）', () => {
        const old = sighting('old', '11K', '10701', '06:30');
        const recent = sighting('recent', '12K', '10701', '08:40');
        const later = sighting('later', '12K', '10701', '10:00');
        for (const sightings of [
            [old, recent, later],
            [later, recent, old],
        ]) {
            expect(
                carry.resolveForOperation({
                    sightings,
                    operationNumber: '11K',
                    searchTime: at('09:00'),
                })?.sighting.id,
            ).toBe('recent');
        }
    });
    it('同じ編成の最新の目撃が同じ行程表の中なら追い出されない', () => {
        expect(
            carry.resolveForOperation({
                sightings: [
                    sighting('s2', '12K', '10701', '08:40'),
                    sighting('s1', '11K', '10701', '07:00'),
                ],
                operationNumber: '12K',
                searchTime: at('09:00'),
            })?.sighting.id,
        ).toBe('s2');
    });
    it('追い出した編成の、より古い目撃は使わない', () => {
        // 10701 は 07:00 に 11K で、10702 は 09:00 に 12K で目撃。11K には 10702 が出る
        const r = carry.resolveForOperation({
            sightings: [
                sighting('s1', '11K', '10701', '07:00'),
                sighting('s2', '12K', '10702', '09:00'),
            ],
            operationNumber: '11K',
            searchTime: at('09:30'),
        });
        expect(r?.sighting.formation?.formationNumber).toBe('10702');
        expect(r?.sightedAsOperation?.operationNumber).toBe('12K');
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
        ).toBeNull();
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
        expect(r?.sighting.id).toBe('s');
        expect(r?.sightedAsOperation).toBeNull();
    });
    it('3 つの運番がつながる行程では、端の運番どうしにも引き継ぐ', () => {
        const r = SightingCarryOver.create(chain3).resolveForOperation({
            sightings: [sighting('s', '11K', '10701', '07:00')],
            operationNumber: '13K',
            searchTime: at('13:00'),
        });
        expect(r?.sightedAsOperation?.operationNumber).toBe('11K');
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
        expect(out[0].id).toBe('a#12K');
    });
    it('別の編成の直接目撃があっても、この編成の引き継ぎは作る', () => {
        const out = carry.buildCarried({
            sightings: [
                sighting('a', '11K', '10701', '07:00'),
                sighting('b', '12K', '10702', '09:00'),
            ],
            operations,
        });
        expect(out.map((o) => o.id)).toEqual(['a#12K', 'b#11K']);
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
    it('あとから別の行程表で追い出されても、履歴には引き継ぎを作る', () => {
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
        expect(out.some((o) => o.id === 'a#12K')).toBe(true);
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
