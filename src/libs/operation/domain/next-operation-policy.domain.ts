import { UseCaseError } from '../../../core/classes/custom-error.js';
import {
    ItineraryLinkRule,
    ItinerarySegment,
} from './itinerary-link-rule.domain.js';

/** 送られた区間の運番・駅・時刻・列車のまとまり（決まり 1 を送られた値で組み直す材料） */
export type ProposedSegmentShape = Omit<
    ItinerarySegment,
    'id' | 'nextTripOperationListId'
>;

export interface ProposedNextSegment {
    id: string | undefined;
    nextTripOperationListId?: string | null;
    /** 送られた区間の中身。あれば DB の値を上書きして決まり 1 を組む（id が無い新しい区間も判定に入る） */
    segment?: ProposedSegmentShape;
}

/**
 * 「次の運用」（next_trip_operation_list_id）の不変条件（spec 4.6）。
 * 行程表の組み立てと同じ材料（区間の一覧）で検証する。違反は UseCaseError（422 相当）で返す
 */
export class NextOperationPolicy {
    private constructor() {}

    static validate(params: {
        /** 書き込み前の既存の区間すべて */
        segments: ItinerarySegment[];
        /** 同じ書き込みで消える既存の区間（無いものとして数える） */
        removedIds?: string[];
        proposed: ProposedNextSegment[];
    }): void {
        const { proposed } = params;
        const removed = new Set(params.removedIds ?? []);
        const existing = params.segments.filter((o) => !removed.has(o.id));
        const exists = new Set(existing.map((o) => o.id));
        // 書き込み後の「次の運用」。送られなかった値（undefined）は今のまま
        const after = new Map(
            existing.map((o) => [o.id, o.nextTripOperationListId]),
        );
        for (const p of proposed) {
            if (p.nextTripOperationListId === undefined) continue;
            if (p.nextTripOperationListId !== null) {
                if (!exists.has(p.nextTripOperationListId)) {
                    throw new UseCaseError(
                        '次の運用は同じダイヤの運用の区間を選んでください',
                        {
                            nextTripOperationListId: p.nextTripOperationListId,
                            reason: 'next_segment_not_found',
                        },
                    );
                }
                if (p.id && p.id === p.nextTripOperationListId) {
                    throw new UseCaseError('次の運用に自分自身は選べません', {
                        id: p.id,
                        reason: 'next_segment_self',
                    });
                }
            }
            if (p.id) after.set(p.id, p.nextTripOperationListId);
        }

        // 決まり 1（列車の途中の運番替わり）で行き元・行き先がすでに決まっている区間は、決まり 2 が効かない。
        // 判定は保存前の DB の値でなく、送られてきた値で組み直す
        const keyOf = (p: ProposedNextSegment, i: number) => p.id ?? `new:${i}`;
        const overrides = new Map(
            proposed.flatMap((p) =>
                p.id && p.segment ? [[p.id, p.segment] as const] : [],
            ),
        );
        const rule1 = ItineraryLinkRule.resolve([
            ...existing.map((o) => ({
                ...o,
                ...overrides.get(o.id),
                nextTripOperationListId: null,
            })),
            ...proposed.flatMap((p, i) =>
                !p.id && p.segment
                    ? [
                          {
                              ...p.segment,
                              id: keyOf(p, i),
                              nextTripOperationListId: null,
                          },
                      ]
                    : [],
            ),
        ]);
        proposed.forEach((p, i) => {
            const to = p.nextTripOperationListId;
            if (!to) return;
            if (
                rule1.next.get(keyOf(p, i))?.rule === 1 ||
                rule1.previous.get(to)?.rule === 1
            ) {
                throw new UseCaseError(
                    '列車の途中で運番が替わる区間には、次の運用を設定できません',
                    {
                        id: p.id,
                        nextTripOperationListId: to,
                        reason: 'next_segment_conflicts_rule1',
                    },
                );
            }
        });

        const pointed = new Map<string, number>();
        const targets = [
            ...after.values(),
            ...proposed
                .filter((p) => !p.id)
                .map((p) => p.nextTripOperationListId),
        ];
        for (const to of targets) {
            if (!to) continue;
            pointed.set(to, (pointed.get(to) ?? 0) + 1);
            if (pointed.get(to)! > 1) {
                throw new UseCaseError(
                    'この区間はすでに別の区間の次の運用になっています',
                    {
                        nextTripOperationListId: to,
                        reason: 'next_segment_duplicated',
                    },
                );
            }
        }

        for (const start of after.keys()) {
            const seen = new Set<string>();
            let cur: string | null | undefined = start;
            while (cur) {
                if (seen.has(cur)) {
                    throw new UseCaseError('次の運用が輪になっています', {
                        id: start,
                        reason: 'next_segment_cycle',
                    });
                }
                seen.add(cur);
                cur = after.get(cur);
            }
        }
    }
}
