import {
    compareSegmentsByTime,
    ItineraryLink,
    ItineraryLinkRule,
    ItinerarySegment,
} from 'src/libs/operation/domain/itinerary-link-rule.domain';

/**
 * 車両の行程表の読み取り用モデル（spec 3.6）。区間の一覧から、車両 1 台ぶんの 1 日の行程を組み立てて引けるようにする。
 * 区間のつなぎ方（決まり 1 → 2 → 3）は domain の ItineraryLinkRule が決める。ここは索引と引く口だけ。
 */

/**
 * 受け持ち中 → 直前に終わった区間 → 最初の区間（時刻順の配列から選ぶ）。
 * アクティブな区間は半開区間 [startSeconds, endSeconds) を使用（到着時刻は次の区間に属する）
 */
function pickAt(
    sorted: ItinerarySegment[],
    seconds: number,
): ItinerarySegment | null {
    if (!sorted.length) return null;
    const active = sorted.find(
        (s) => s.startSeconds <= seconds && seconds < s.endSeconds,
    );
    if (active) return active;
    const ended = sorted.filter((s) => s.endSeconds <= seconds);
    return ended.length ? ended[ended.length - 1] : sorted[0];
}

/** 1 本の行程（車両がたどる区間の連なり）。VehicleItineraryReadModel.create が作る */
export class VehicleItinerary {
    private readonly timeOrdered: ItinerarySegment[];

    private constructor(private readonly chain: ItinerarySegment[]) {
        this.timeOrdered = [...chain].sort(compareSegmentsByTime);
    }

    static create(chain: ItinerarySegment[]): VehicleItinerary {
        return new VehicleItinerary(chain);
    }

    /** つながり順の区間 */
    get segments(): ItinerarySegment[] {
        return this.chain;
    }

    /** この行程が受け持つ運番（重複なし） */
    operationNumbers(): string[] {
        return [...new Set(this.chain.map((s) => s.operationNumber))];
    }

    /** その時刻に受け持っている区間 → 直前に終わった区間 → 最初の区間 */
    segmentAt(seconds: number): ItinerarySegment | null {
        return pickAt(this.timeOrdered, seconds);
    }
}

export class VehicleItineraryReadModel {
    private constructor(
        private readonly itineraryList: VehicleItinerary[],
        private readonly itineraryById: Map<string, VehicleItinerary>,
        private readonly next: Map<string, ItineraryLink>,
        private readonly previous: Map<string, ItineraryLink>,
        private readonly byOperation: Map<string, ItinerarySegment[]>,
    ) {}

    static create(segments: ItinerarySegment[]): VehicleItineraryReadModel {
        const sorted = [...segments].sort(compareSegmentsByTime);
        const { next, previous } = ItineraryLinkRule.resolve(sorted);

        const byOperation = new Map<string, ItinerarySegment[]>();
        for (const s of sorted) {
            if (!byOperation.has(s.operationNumber))
                byOperation.set(s.operationNumber, []);
            byOperation.get(s.operationNumber)!.push(s);
        }

        // 頭（前の無い区間）からたどる。輪になって頭の無いものは、いちばん早い区間で切る
        const itineraryList: VehicleItinerary[] = [];
        const itineraryById = new Map<string, VehicleItinerary>();
        const walk = (head: ItinerarySegment) => {
            const chain: ItinerarySegment[] = [];
            const inChain = new Set<string>();
            let cur: ItinerarySegment | undefined = head;
            while (cur && !itineraryById.has(cur.id) && !inChain.has(cur.id)) {
                inChain.add(cur.id);
                chain.push(cur);
                cur = next.get(cur.id)?.segment;
            }
            const itinerary = VehicleItinerary.create(chain);
            for (const s of chain) itineraryById.set(s.id, itinerary);
            itineraryList.push(itinerary);
        };
        for (const s of sorted)
            if (!previous.has(s.id) && !itineraryById.has(s.id)) walk(s);
        for (const s of sorted) if (!itineraryById.has(s.id)) walk(s);

        return new VehicleItineraryReadModel(
            itineraryList,
            itineraryById,
            next,
            previous,
            byOperation,
        );
    }

    /** すべての行程 */
    all(): VehicleItinerary[] {
        return this.itineraryList;
    }

    /** すべての区間（行程ごと・つながり順） */
    segments(): ItinerarySegment[] {
        return this.itineraryList.flatMap((i) => i.segments);
    }

    /** 区間が入っている行程 */
    itineraryOf(segmentId: string): VehicleItinerary | undefined {
        return this.itineraryById.get(segmentId);
    }

    /** 区間の前後のつながり */
    linksOf(segmentId: string): {
        previous: ItineraryLink | null;
        next: ItineraryLink | null;
    } {
        return {
            previous: this.previous.get(segmentId) ?? null,
            next: this.next.get(segmentId) ?? null,
        };
    }

    /** その時刻にその運番を受け持っている区間 */
    segmentOfOperationAt(
        operationNumber: string,
        seconds: number,
    ): ItinerarySegment | null {
        return pickAt(this.byOperation.get(operationNumber) ?? [], seconds);
    }

    /** その時刻にその運番を受け持っている区間の行程 */
    itineraryOfOperationAt(
        operationNumber: string,
        seconds: number,
    ): VehicleItinerary | undefined {
        const segment = this.segmentOfOperationAt(operationNumber, seconds);
        return segment ? this.itineraryOf(segment.id) : undefined;
    }
}
