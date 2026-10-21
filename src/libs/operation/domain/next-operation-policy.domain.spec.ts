import { UseCaseError } from '../../../core/classes/custom-error.js';
import { ItinerarySegment } from './itinerary-link-rule.domain.js';
import {
    NextOperationPolicy,
    ProposedSegmentShape,
} from './next-operation-policy.domain.js';

const plain = (id: string, next: string | null = null): ItinerarySegment => ({
    id,
    tripId: id,
    tripBlockId: id,
    operationId: 'o',
    operationNumber: '1',
    startStationId: 'a',
    endStationId: 'b',
    startSeconds: 0,
    endSeconds: 1,
    nextTripOperationListId: next,
});

describe('NextOperationPolicy.validate', () => {
    it('ふつうのつながりは通す', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('b')],
                proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
            }),
        ).not.toThrow();
    });
    it('送られなかった・null は検めない', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a')],
                proposed: [
                    { id: 'a' },
                    { id: undefined, nextTripOperationListId: null },
                ],
            }),
        ).not.toThrow();
    });
    it('ほかのカレンダーの区間（existing に無い）は拒む', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a')],
                proposed: [{ id: 'a', nextTripOperationListId: 'zzz' }],
            }),
        ).toThrow(UseCaseError);
    });
    it('自分自身は拒む', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a')],
                proposed: [{ id: 'a', nextTripOperationListId: 'a' }],
            }),
        ).toThrow(UseCaseError);
    });
    it('すでに別の区間が指している区間は拒む', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('b'), plain('c', 'b')],
                proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
            }),
        ).toThrow(UseCaseError);
    });
    it('指していた既存の区間を、同じ書き込みで外すなら通す', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('b'), plain('c', 'b')],
                proposed: [
                    { id: 'a', nextTripOperationListId: 'b' },
                    { id: 'c', nextTripOperationListId: null },
                ],
            }),
        ).not.toThrow();
    });
    it('輪になるつながりは拒む', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('b', 'a')],
                proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
            }),
        ).toThrow(UseCaseError);
    });
    it('消える区間が指していた先を、新しい区間が指すのは通す', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('c', 'b'), plain('b')],
                removedIds: ['c'],
                proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
            }),
        ).not.toThrow();
    });
    it('消える区間を指すのは拒む', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('c')],
                removedIds: ['c'],
                proposed: [{ id: 'a', nextTripOperationListId: 'c' }],
            }),
        ).toThrow(UseCaseError);
    });

    describe('決まり 1 との衝突', () => {
        // 同じ列車のまとまり blk の中で、A（運番 1）の終点 X から B（運番 2）が出る → 決まり 1 で A → B
        const r = (
            id: string,
            o: Partial<ItinerarySegment>,
        ): ItinerarySegment => ({
            ...plain(id),
            tripBlockId: 'blk',
            ...o,
        });
        const A = r('A', {
            operationNumber: '1',
            endStationId: 'X',
            startSeconds: 0,
            endSeconds: 100,
        });
        const B = r('B', {
            operationNumber: '2',
            startStationId: 'X',
            startSeconds: 100,
            endSeconds: 200,
        });
        const Z = plain('Z');
        it('決まり 1 で行き元がある区間を次の運用にするのは拒む', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, Z],
                    proposed: [{ id: 'Z', nextTripOperationListId: 'B' }],
                }),
            ).toThrow(
                expect.objectContaining({
                    context: expect.objectContaining({
                        reason: 'next_segment_conflicts_rule1',
                    }),
                }),
            );
        });
        it('決まり 1 で行き先がある区間に次の運用を入れるのは拒む', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, Z],
                    proposed: [{ id: 'A', nextTripOperationListId: 'Z' }],
                }),
            ).toThrow(UseCaseError);
        });
        it('決まり 1 に関係ない区間どうしは通す', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, Z, plain('Y')],
                    proposed: [{ id: 'Z', nextTripOperationListId: 'Y' }],
                }),
            ).not.toThrow();
        });
        it('新しく作る区間（id なし）が決まり 1 で行き先を持つなら、次の運用は拒む', () => {
            const N: ProposedSegmentShape = {
                tripId: 'n',
                tripBlockId: 'blk',
                operationId: 'o',
                operationNumber: '0',
                startStationId: 'W',
                endStationId: 'a',
                startSeconds: -100,
                endSeconds: 0,
            };
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, Z],
                    proposed: [
                        {
                            id: undefined,
                            nextTripOperationListId: 'Z',
                            segment: N,
                        },
                    ],
                }),
            ).toThrow(
                expect.objectContaining({
                    context: expect.objectContaining({
                        reason: 'next_segment_conflicts_rule1',
                    }),
                }),
            );
        });
        it('同じ保存で運番の替わりを無くすなら、次の運用は通す', () => {
            const { id: _id, nextTripOperationListId: _n, ...shape } = B;
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, Z],
                    proposed: [
                        { id: 'B', segment: { ...shape, startStationId: 'Y' } },
                        { id: 'Z', nextTripOperationListId: 'B' },
                    ],
                }),
            ).not.toThrow();
        });
        it('同じ保存で新しく決まり 1 ができるなら、次の運用は拒む', () => {
            const C = r('C', {
                operationNumber: '2',
                startStationId: 'Y',
                startSeconds: 100,
                endSeconds: 200,
            });
            const { id: _id, nextTripOperationListId: _n, ...shape } = C;
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, C, Z],
                    proposed: [
                        { id: 'C', segment: { ...shape, startStationId: 'X' } },
                        { id: 'Z', nextTripOperationListId: 'C' },
                    ],
                }),
            ).toThrow(UseCaseError);
        });
    });
});

describe('NextOperationPolicy.validate（reason ごとの 422 と境界）', () => {
    const reasonOf = (fn: () => void) => {
        try {
            fn();
        } catch (e) {
            return (e as UseCaseError).context?.reason;
        }
        return undefined;
    };
    const rule1Pair = (): ItinerarySegment[] => [
        {
            ...plain('A'),
            tripBlockId: 'blk',
            operationNumber: '1',
            endStationId: 'X',
            startSeconds: 0,
            endSeconds: 100,
        },
        {
            ...plain('B'),
            tripBlockId: 'blk',
            operationNumber: '2',
            startStationId: 'X',
            startSeconds: 100,
            endSeconds: 200,
        },
    ];

    it('存在しない区間を指すと next_segment_not_found で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a')],
                    proposed: [{ id: 'a', nextTripOperationListId: 'zzz' }],
                }),
            ),
        ).toBe('next_segment_not_found');
    });
    it('新しい区間（id なし）が存在しない区間を指しても next_segment_not_found で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a')],
                    proposed: [
                        { id: undefined, nextTripOperationListId: 'zzz' },
                    ],
                }),
            ),
        ).toBe('next_segment_not_found');
    });
    it('自分自身を指すと next_segment_self で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a')],
                    proposed: [{ id: 'a', nextTripOperationListId: 'a' }],
                }),
            ),
        ).toBe('next_segment_self');
    });
    it('新しい区間（id なし）は自分自身を指せないので self にならない', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a')],
                proposed: [{ id: undefined, nextTripOperationListId: 'a' }],
            }),
        ).not.toThrow();
    });
    it('同じ区間を 2 つの既存区間が指すと next_segment_duplicated で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a'), plain('b'), plain('c')],
                    proposed: [
                        { id: 'a', nextTripOperationListId: 'c' },
                        { id: 'b', nextTripOperationListId: 'c' },
                    ],
                }),
            ),
        ).toBe('next_segment_duplicated');
    });
    it('新しい区間が、すでに指されている区間を指すと next_segment_duplicated で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a', 'c'), plain('c')],
                    proposed: [{ id: undefined, nextTripOperationListId: 'c' }],
                }),
            ),
        ).toBe('next_segment_duplicated');
    });
    it('新しい区間どうしが同じ区間を指しても next_segment_duplicated で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('c')],
                    proposed: [
                        { id: undefined, nextTripOperationListId: 'c' },
                        { id: undefined, nextTripOperationListId: 'c' },
                    ],
                }),
            ),
        ).toBe('next_segment_duplicated');
    });
    it('3 区間の輪は next_segment_cycle で拒む', () => {
        expect(
            reasonOf(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a'), plain('b', 'c'), plain('c', 'a')],
                    proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
                }),
            ),
        ).toBe('next_segment_cycle');
    });
    it('輪でない長い鎖は通す', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a'), plain('b', 'c'), plain('c'), plain('d')],
                proposed: [{ id: 'a', nextTripOperationListId: 'b' }],
            }),
        ).not.toThrow();
    });
    it('決まり 1 との衝突は next_segment_conflicts_rule1 で拒み、context に id と行き先が入る', () => {
        let ctx: Record<string, unknown> | undefined;
        try {
            NextOperationPolicy.validate({
                segments: [...rule1Pair(), plain('Z')],
                proposed: [{ id: 'Z', nextTripOperationListId: 'B' }],
            });
        } catch (e) {
            ctx = (e as UseCaseError).context as Record<string, unknown>;
        }
        expect(ctx).toEqual({
            id: 'Z',
            nextTripOperationListId: 'B',
            reason: 'next_segment_conflicts_rule1',
        });
    });
    it('例外は UseCaseError で、メッセージが入る', () => {
        try {
            NextOperationPolicy.validate({
                segments: [plain('a')],
                proposed: [{ id: 'a', nextTripOperationListId: 'a' }],
            });
            throw new Error('投げられなかった');
        } catch (e) {
            expect(e).toBeInstanceOf(UseCaseError);
            expect((e as Error).message).toContain('自分自身');
        }
    });
    it('segments が空でも、何も指さなければ通す', () => {
        expect(() =>
            NextOperationPolicy.validate({ segments: [], proposed: [] }),
        ).not.toThrow();
    });
    it('proposed が空なら既存の値は検めない', () => {
        expect(() =>
            NextOperationPolicy.validate({
                segments: [plain('a', 'zzz')],
                proposed: [],
            }),
        ).not.toThrow();
    });

    describe('removedIds', () => {
        it('removedIds を渡さなければ既存の区間はすべて残る', () => {
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [plain('a'), plain('c')],
                        proposed: [{ id: 'a', nextTripOperationListId: 'c' }],
                    }),
                ),
            ).toBeUndefined();
        });
        it('消える区間は、決まり 1 の行き元としても数えない', () => {
            // A が消えれば B は決まり 1 の行き先ではなくなり、Z → B を入れられる
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [...rule1Pair(), plain('Z')],
                    removedIds: ['A'],
                    proposed: [{ id: undefined, nextTripOperationListId: 'B' }],
                }),
            ).not.toThrow();
        });
        it('消える区間が指していた先を別の区間が指しても、重複にならない', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [plain('x', 'c'), plain('a'), plain('c')],
                    removedIds: ['x'],
                    proposed: [{ id: 'a', nextTripOperationListId: 'c' }],
                }),
            ).not.toThrow();
        });
        it('消える区間を含む輪は、輪として数えない', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a'), plain('b', 'a')],
                    removedIds: ['b'],
                    proposed: [{ id: 'a', nextTripOperationListId: null }],
                }),
            ).not.toThrow();
        });
        it('消える区間を指す reason は next_segment_not_found', () => {
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [plain('a'), plain('c')],
                        removedIds: ['c'],
                        proposed: [{ id: 'a', nextTripOperationListId: 'c' }],
                    }),
                ),
            ).toBe('next_segment_not_found');
        });
    });

    describe('新規区間（id なし）', () => {
        const shape = (
            o: Partial<ProposedSegmentShape>,
        ): ProposedSegmentShape => {
            const { id: _i, nextTripOperationListId: _n, ...base } = plain('n');
            return { ...base, ...o };
        };
        it('次の運用を持たない新規区間は、何も検めずに通す', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [plain('a')],
                    proposed: [{ id: undefined, segment: shape({}) }],
                }),
            ).not.toThrow();
        });
        it('新規区間が決まり 1 で行き元を持つ区間を指すと拒む', () => {
            // 新規 N（blk, a → X, 〜0）→ 既存 B ではなく、N が B の行き元になる場合
            const N = shape({
                tripBlockId: 'blk',
                operationNumber: '0',
                startStationId: 'W',
                endStationId: 'X',
                startSeconds: -100,
                endSeconds: 100,
            });
            const A = { ...plain('A'), tripBlockId: 'blk' };
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [
                            ...rule1Pair().filter((s) => s.id === 'B'),
                            A,
                            plain('Z'),
                        ],
                        proposed: [
                            {
                                id: undefined,
                                nextTripOperationListId: 'Z',
                                segment: N,
                            },
                        ],
                    }),
                ),
            ).toBe('next_segment_conflicts_rule1');
        });
        it('segment を送らない新規区間は、決まり 1 の判定に入らず通す', () => {
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [...rule1Pair(), plain('Z')],
                    proposed: [{ id: undefined, nextTripOperationListId: 'Z' }],
                }),
            ).not.toThrow();
        });
    });

    describe('送られた値で決まり 1 を組み直す', () => {
        const strip = (s: ItinerarySegment): ProposedSegmentShape => {
            const { id: _i, nextTripOperationListId: _n, ...shape } = s;
            return shape;
        };
        it('送られた segment が DB の値を上書きして、決まり 1 が新しくできるなら拒む', () => {
            const [A, B] = rule1Pair();
            // DB では駅が違い決まり 1 は無い。送られた駅が合うので決まり 1 ができる
            const bFar = { ...B, startStationId: 'far' };
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [A, bFar, plain('Z')],
                        proposed: [
                            { id: 'B', segment: strip(B) },
                            { id: 'Z', nextTripOperationListId: 'B' },
                        ],
                    }),
                ),
            ).toBe('next_segment_conflicts_rule1');
        });
        it('DB では決まり 1 があっても、送られた値で外れるなら通す（時刻をずらす）', () => {
            const [A, B] = rule1Pair();
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, plain('Z')],
                    proposed: [
                        {
                            id: 'B',
                            segment: { ...strip(B), startSeconds: 50 },
                        },
                        { id: 'Z', nextTripOperationListId: 'B' },
                    ],
                }),
            ).not.toThrow();
        });
        it('DB では決まり 1 があっても、送られた trip_block が替わって外れるなら通す', () => {
            const [A, B] = rule1Pair();
            expect(() =>
                NextOperationPolicy.validate({
                    segments: [A, B, plain('Z')],
                    proposed: [
                        {
                            id: 'B',
                            segment: { ...strip(B), tripBlockId: 'other' },
                        },
                        { id: 'Z', nextTripOperationListId: 'B' },
                    ],
                }),
            ).not.toThrow();
        });
        it('segment を送らなければ DB の値で決まり 1 を判定する', () => {
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [...rule1Pair(), plain('Z')],
                        proposed: [{ id: 'B', nextTripOperationListId: null }],
                    }),
                ),
            ).toBeUndefined();
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [...rule1Pair(), plain('Z')],
                        proposed: [{ id: 'Z', nextTripOperationListId: 'B' }],
                    }),
                ),
            ).toBe('next_segment_conflicts_rule1');
        });
        it('決まり 1 の判定では、既存の next_trip_operation_list_id は使わない（決まり 2 に影響されない）', () => {
            const [A, B] = rule1Pair();
            // A.next が Z を指していても、決まり 1 だけで組み直すので A → B の決まり 1 が見つかる
            expect(
                reasonOf(() =>
                    NextOperationPolicy.validate({
                        segments: [
                            { ...A, nextTripOperationListId: 'Z' },
                            B,
                            plain('Z'),
                            plain('Y'),
                        ],
                        proposed: [{ id: 'Y', nextTripOperationListId: 'B' }],
                    }),
                ),
            ).toBe('next_segment_conflicts_rule1');
        });
    });
});
