/**
 * 車両の行程表（spec 3.6）の「区間のつなぎ方」。区間（trip_operation_lists）の一覧から、各区間の次・前を決める。
 * 決まりは 1 → 2 → 3 の順。つなぎ方の規則はここ 1 か所だけに置く（書き込みの検証も読み取りの組み立ても使う）。
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

/** 区間ごとのつながり。キーは区間の id */
export interface ItineraryLinks {
    next: Map<string, ItineraryLink>;
    previous: Map<string, ItineraryLink>;
}

/** 区間の並び（出発 → 到着 → id）。つなぎ方の「同時刻は byTime 順」はこの並び */
export const compareSegmentsByTime = (
    a: ItinerarySegment,
    b: ItinerarySegment,
) =>
    a.startSeconds - b.startSeconds ||
    a.endSeconds - b.endSeconds ||
    a.id.localeCompare(b.id);

/** 述語が true の要素が前、false が後に並ぶ配列で、最初に false になる位置（二分探索） */
function partitionPoint<T>(arr: T[], pred: (x: T) => boolean): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pred(arr[mid])) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export class ItineraryLinkRule {
    private constructor() {}

    /** 区間の一覧から、各区間の次・前のつながり（決まり 1 → 2 → 3）を返す */
    static resolve(segments: ItinerarySegment[]): ItineraryLinks {
        const sorted = [...segments].sort(compareSegmentsByTime);
        const byId = new Map(sorted.map((s) => [s.id, s]));
        const next = new Map<string, ItineraryLink>();
        const previous = new Map<string, ItineraryLink>();

        const link = (
            from: ItinerarySegment,
            to: ItinerarySegment,
            rule: ItineraryRule,
        ): boolean => {
            if (from.id === to.id || next.has(from.id) || previous.has(to.id))
                return false;
            next.set(from.id, { segment: to, rule });
            previous.set(to.id, { segment: from, rule });
            return true;
        };

        /**
         * 決まり 1（1 つの列車のまとまり ごと）。
         * nextDeparture(o): o より後に出る最初の区間（どの駅からでも。同時刻は byTime 順）。
         * prevArrival(d): d より前に着く最後の区間（どの駅へでも。同時刻は byTime 順で後）。
         * c = nextDeparture(s)。c が s の着駅から出るとき、ending（その駅に着き nextDeparture が c）が [s]、
         * starting（その駅から出て prevArrival が s）が [c] のときだけ s → c をつなぐ。
         */
        const linkRule1 = (block: ItinerarySegment[]) => {
            // block は byTime 順（startSeconds 昇順）。byEnd は endSeconds 昇順（安定ソートで同時刻は byTime 順のまま）
            const byEnd = [...block].sort(
                (a, b) => a.endSeconds - b.endSeconds,
            );
            const nextDeparture = new Map<string, ItinerarySegment>();
            for (const o of block) {
                let i = partitionPoint(
                    block,
                    (d) => d.startSeconds < o.endSeconds,
                );
                if (i < block.length && block[i].id === o.id) i++;
                if (i < block.length) nextDeparture.set(o.id, block[i]);
            }
            const prevArrival = new Map<string, ItinerarySegment>();
            for (const d of block) {
                let j =
                    partitionPoint(
                        byEnd,
                        (a) => a.endSeconds <= d.startSeconds,
                    ) - 1;
                if (j >= 0 && byEnd[j].id === d.id) j--;
                if (j >= 0) prevArrival.set(d.id, byEnd[j]);
            }
            // ending: 着駅 × 次の出発 でまとめる
            const endingBy = new Map<string, ItinerarySegment[]>();
            for (const o of block) {
                const c = nextDeparture.get(o.id);
                if (!c) continue;
                const key = `${c.id}\u0000${o.endStationId}`;
                if (!endingBy.has(key)) endingBy.set(key, []);
                endingBy.get(key)!.push(o);
            }
            // starting: 直前の到着 × 出発駅 でまとめる
            const startingBy = new Map<string, ItinerarySegment[]>();
            for (const d of block) {
                const p = prevArrival.get(d.id);
                if (!p) continue;
                const key = `${p.id}\u0000${d.startStationId}`;
                if (!startingBy.has(key)) startingBy.set(key, []);
                startingBy.get(key)!.push(d);
            }
            for (const s of block) {
                const c = nextDeparture.get(s.id);
                if (!c || c.startStationId !== s.endStationId) continue;
                const ending =
                    endingBy.get(`${c.id}\u0000${s.endStationId}`) ?? [];
                const starting =
                    startingBy.get(`${s.id}\u0000${s.endStationId}`) ?? [];
                if (
                    ending.length === 1 &&
                    ending[0].id === s.id &&
                    starting.length === 1 &&
                    starting[0].id === c.id
                ) {
                    link(s, c, 1);
                }
            }
        };

        // 決まり 1
        const byBlock = new Map<string, ItinerarySegment[]>();
        for (const s of sorted) {
            if (!byBlock.has(s.tripBlockId)) byBlock.set(s.tripBlockId, []);
            byBlock.get(s.tripBlockId)!.push(s);
        }
        for (const block of byBlock.values()) linkRule1(block);

        // 決まり 2
        for (const s of sorted) {
            if (next.has(s.id) || !s.nextTripOperationListId) continue;
            const to = byId.get(s.nextTripOperationListId);
            if (to) link(s, to, 2);
        }

        // 決まり 3
        const byOperation = new Map<string, ItinerarySegment[]>();
        for (const s of sorted) {
            if (!byOperation.has(s.operationNumber))
                byOperation.set(s.operationNumber, []);
            byOperation.get(s.operationNumber)!.push(s);
        }
        for (const list of byOperation.values()) {
            for (let i = 0; i < list.length - 1; i++) {
                if (!next.has(list[i].id)) link(list[i], list[i + 1], 3);
            }
        }

        return { next, previous };
    }
}
