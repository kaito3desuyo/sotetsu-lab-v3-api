import dayjs from 'dayjs';
import { ItinerarySegment } from '../../../operation/domain/itinerary-link-rule.domain.js';
import { getBaseDate } from '../../../../core/utils/datetime.js';
import {
    VehicleItineraryReadModel,
    VehicleItinerary,
} from '../../../operation/usecase/read-models/vehicle-itinerary.read-model.js';

/**
 * 目撃の枠割り当て（docs/superpowers/specs/2026-10-19-sighting-run-assignment-design.md）。規則はここ 1 か所に集める。
 * 行程を運番が切り替わる「枠」に分け、1 鉄道日ぶんの目撃から枠ごとに編成を割り当てる（実目撃 → 推測）。
 * real-time の運用カード・編成カードと、過去の運用情報は、この割り当てを引くだけにする。
 * 戻り値: 割り当て＝オブジェクト、null＝不明、'unsighted'＝行程に今日の実目撃が無い（運用カードのみ）、
 * undefined＝行程表で判定できない（呼び出し側は今の判定へ落とす）。
 */
export type SightedAsOperation = {
    operationId: string;
    operationNumber: string;
};

/** 割り当ての規則が見る目撃の最小の形（usecase の DTO はこれを満たす） */
export interface CarrySighting {
    id: string;
    operationSightingId: string;
    operationId: string;
    sightingTime: Date;
    createdAt?: Date;
    /** 無効化されていれば非 null（過去の運用で無効化も表示するときだけ材料に入る） */
    invalidation?: object | null;
    formationId?: string;
    operation?: { operationNumber: string } | null;
    formation?: { formationId?: string; formationNumber: string } | null;
}

const secondsOf = (time: Date) => {
    const t = dayjs(time);
    return t.diff(getBaseDate(t), 'second');
};

/**
 * 目撃の新旧（古いほうが負）。時刻 → 投稿時刻 → id の順に比べ、同じ時刻でも入力の並びによらず決まる。
 * 同じ時刻なら、あとから投稿されたほうを訂正とみなして新しい扱いにする（ユーザー判断 2026-10-19）
 */
const compareSightings = (a: CarrySighting, b: CarrySighting): number =>
    dayjs(a.sightingTime).valueOf() - dayjs(b.sightingTime).valueOf() ||
    (a.createdAt ? dayjs(a.createdAt).valueOf() : 0) -
        (b.createdAt ? dayjs(b.createdAt).valueOf() : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** 検索時刻までの目撃を新しい順に */
const usable = <S extends CarrySighting>(
    sightings: S[],
    searchTime: dayjs.Dayjs,
): S[] =>
    sightings
        .filter((s) => !dayjs(s.sightingTime).isAfter(searchTime))
        .sort((a, b) => compareSightings(b, a));

/** 推測した割り当てに添える、推測の元の目撃の運番（同じ番号でも添える） */
const sourceOf = (s: CarrySighting): SightedAsOperation | null =>
    s.operation
        ? {
              operationId: s.operationId,
              operationNumber: s.operation.operationNumber,
          }
        : null;

const formationIdOf = (s: CarrySighting) =>
    s.formationId ?? s.formation?.formationId;

const runStartOf = (run: ItinerarySegment[]) =>
    Math.min(...run.map((r) => r.startSeconds));
const runEndOf = (run: ItinerarySegment[]) =>
    Math.max(...run.map((r) => r.endSeconds));

/** 枠 1 つへの割り当て（spec 3.2） */
export type RunAssignment<S extends CarrySighting> = {
    /** 実目撃ならその枠の一番新しい実目撃、推測なら同じ行程でのその編成の一番新しい実目撃（有効なものを優先） */
    sighting: S;
    /** 編成の無い実目撃なら undefined */
    formationNumber: string | undefined;
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
}

export class SightingCarryOver {
    /** 一括取得で運番ごとに呼ばれても、同じ行程表なら同じインスタンス（割り当てを使い回す） */
    private static readonly instances = new WeakMap<
        VehicleItineraryReadModel,
        SightingCarryOver
    >();

    /**
     * 目撃の配列 → 検索時刻（ms。過去の運用は -1）→ 割り当て。配列そのものをキーにするので、
     * 渡した配列はあとから足したり並べ替えたりしない約束（変えると古い割り当てが返る）。呼ぶ側は要求ごとに配列を作る
     */
    private readonly assignmentCache = new WeakMap<
        object,
        Map<number, RunAssignments<CarrySighting>>
    >();

    /** buildCarried が作った目撃 → その行程と枠の始まり（鉄道日の 0 時からの秒） */
    private readonly carriedPlacements = new WeakMap<
        object,
        { itinerary: VehicleItinerary; start: number }
    >();

    /** 目撃の配列 → 編成 ID → 行程への訪問の並び（配列を変えない約束は assignmentCache と同じ） */
    private readonly visitsCache = new WeakMap<
        object,
        Map<
            string,
            { itinerary: VehicleItinerary | undefined; first: number }[]
        >
    >();

    private constructor(
        private readonly itineraries: VehicleItineraryReadModel,
    ) {}

    static create(itineraries: VehicleItineraryReadModel): SightingCarryOver {
        let carry = SightingCarryOver.instances.get(itineraries);
        if (!carry) {
            carry = new SightingCarryOver(itineraries);
            SightingCarryOver.instances.set(itineraries, carry);
        }
        return carry;
    }

    /** 目撃 → 結び付く行程と枠（受け持ち中 → 次 → 直前）。運番が無い・時刻表に無い運番なら undefined */
    private placementOf(
        s: CarrySighting,
    ): { itinerary: VehicleItinerary; run: ItinerarySegment[] } | undefined {
        const number = s.operation?.operationNumber;
        if (!number) return undefined;
        const segment = this.itineraries.segmentOfSightingAt(
            number,
            secondsOf(s.sightingTime),
        );
        if (!segment) return undefined;
        const itinerary = this.itineraries.itineraryOf(segment.id);
        const run = itinerary?.runOf(segment);
        return itinerary && run ? { itinerary, run } : undefined;
    }

    /** 枠の割り当て（spec 3.2）。searchTime を渡せばそれまでの目撃だけを使う */
    private assignmentsOf<S extends CarrySighting>(
        sightings: S[],
        searchTime?: dayjs.Dayjs,
    ): RunAssignments<S> {
        const key = searchTime ? searchTime.valueOf() : -1;
        let byTime = this.assignmentCache.get(sightings);
        if (!byTime) {
            byTime = new Map();
            this.assignmentCache.set(sightings, byTime);
        }
        const cached = byTime.get(key);
        if (cached) return cached as RunAssignments<S>;
        const built = this.buildAssignments(
            searchTime ? usable(sightings, searchTime) : sightings,
        );
        byTime.set(key, built as RunAssignments<CarrySighting>);
        return built;
    }

    private buildAssignments<S extends CarrySighting>(
        sightings: S[],
    ): RunAssignments<S> {
        const placed = sightings.map((s) => ({
            s,
            formationNumber: s.formation?.formationNumber,
            seconds: secondsOf(s.sightingTime),
            at: this.placementOf(s),
        }));
        const byRun = new Map<ItinerarySegment[], RunAssignment<S>>();
        const sighted = new Set<VehicleItinerary>();
        // 1. 実目撃（同じ枠に複数の編成なら一番新しい目撃。併結は無いので入力の食い違い）
        for (const p of placed) {
            if (!p.at) continue;
            sighted.add(p.at.itinerary);
            const current = byRun.get(p.at.run);
            if (!current || compareSightings(p.s, current.sighting) > 0)
                byRun.set(p.at.run, {
                    sighting: p.s,
                    formationNumber: p.formationNumber,
                    inferred: false,
                });
        }
        const direct = new Set(byRun.keys());
        // 2〜4. 推測
        for (const itinerary of sighted) {
            const inItinerary = placed.filter(
                (p) => p.at?.itinerary === itinerary,
            );
            // 編成の無い目撃は実目撃には数えるが、推測の候補にはしない
            const formations = [
                ...new Set(
                    inItinerary.flatMap((p) =>
                        p.formationNumber ? [p.formationNumber] : [],
                    ),
                ),
            ];
            for (const run of itinerary.runs()) {
                if (direct.has(run)) continue;
                const start = runStartOf(run);
                const end = runEndOf(run);
                let best:
                    | {
                          formationNumber: string;
                          source: (typeof placed)[number];
                          before: boolean;
                      }
                    | undefined;
                for (const formationNumber of formations) {
                    const own = inItinerary.filter(
                        (p) => p.formationNumber === formationNumber,
                    );
                    const before = own.filter((p) => p.seconds <= start);
                    const source = before.length
                        ? before.reduce((a, b) =>
                              compareSightings(b.s, a.s) > 0 ? b : a,
                          )
                        : own.reduce((a, b) =>
                              compareSightings(b.s, a.s) < 0 ? b : a,
                          );
                    const from = Math.min(source.seconds, start);
                    const to = Math.max(source.seconds, end);
                    // 枠と元の目撃の間に、別の行程・枠の無い運番（休車 100 など）で目撃されていれば外す
                    const away = placed.some(
                        (o) =>
                            o.formationNumber === formationNumber &&
                            o.at?.itinerary !== itinerary &&
                            from <= o.seconds &&
                            o.seconds <= to,
                    );
                    if (away) continue;
                    const candidate = {
                        formationNumber,
                        source,
                        before: source.seconds <= start,
                    };
                    // 前から続く側（枠の始まりまでで一番遅い）→ 無ければ一番早い
                    const better =
                        !best ||
                        (candidate.before !== best.before
                            ? candidate.before
                            : candidate.before
                              ? compareSightings(
                                    candidate.source.s,
                                    best.source.s,
                                ) > 0
                              : compareSightings(
                                    candidate.source.s,
                                    best.source.s,
                                ) < 0);
                    if (better) best = candidate;
                }
                if (!best) continue;
                const chosen = best.formationNumber;
                const latest = inItinerary
                    .filter((p) => p.formationNumber === chosen)
                    .reduce((a, b) => {
                        // 有効な目撃を優先する。無効化された目撃は、それしか無いときだけ写す（赤枠の「?」は無効化だけが根拠の推測）
                        if (!a.s.invalidation !== !b.s.invalidation)
                            return b.s.invalidation ? a : b;
                        return compareSightings(b.s, a.s) > 0 ? b : a;
                    });
                byRun.set(run, {
                    sighting: latest.s,
                    formationNumber: chosen,
                    inferred: true,
                });
            }
        }
        return new RunAssignments(byRun, sighted);
    }

    /**
     * real-time の運用カード（spec 3.3）。その運番の今の枠（受け持ち中 → 直前に終わった → 最初）の割り当て。
     * null は不明、'unsighted' は行程に今日の実目撃が無い、undefined は行程表で判定できない
     */
    resolveForOperation<S extends CarrySighting>(params: {
        /** その鉄道日の有効な目撃 */
        sightings: S[];
        operationNumber: string;
        searchTime: dayjs.Dayjs;
    }):
        | { sighting: S; sightedAsOperation: SightedAsOperation | null }
        | null
        | 'unsighted'
        | undefined {
        const { operationNumber, searchTime } = params;
        const segment = this.itineraries.segmentOfOperationAt(
            operationNumber,
            secondsOf(searchTime.toDate()),
        );
        if (!segment) return undefined;
        const itinerary = this.itineraries.itineraryOf(segment.id);
        const run = itinerary?.runOf(segment);
        if (!itinerary || !run) return undefined;
        const assignments = this.assignmentsOf(params.sightings, searchTime);
        const assigned = assignments.of(run);
        if (assigned)
            return {
                sighting: assigned.sighting,
                sightedAsOperation: assigned.inferred
                    ? sourceOf(assigned.sighting)
                    : null,
            };
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
    }):
        | {
              sighting: S;
              operationNumber: string;
              sightedAsOperation: SightedAsOperation | null;
          }
        | null
        | undefined {
        const { formationNumber, searchTime } = params;
        const own = usable(params.sightings, searchTime).find(
            (s) => s.formation?.formationNumber === formationNumber,
        );
        if (!own) return undefined;
        const at = this.placementOf(own);
        if (!at) return undefined;
        const segment = at.itinerary.segmentAt(secondsOf(searchTime.toDate()));
        const run = segment ? at.itinerary.runOf(segment) : undefined;
        if (!run) return undefined;
        const assigned = this.assignmentsOf(params.sightings, searchTime).of(
            run,
        );
        if (!assigned || assigned.formationNumber !== formationNumber)
            return null;
        return {
            sighting: assigned.sighting,
            operationNumber: run[0].operationNumber,
            sightedAsOperation: assigned.inferred
                ? sourceOf(assigned.sighting)
                : null,
        };
    }

    /**
     * 過去の運用情報（spec 3.5）。推測した枠ごとに、推測の元の目撃を写した「引き継いだ目撃」を作る。
     * id は `元の id#運番`、同じ行程に同じ運番の枠が 2 つ目以降なら `元の id#運番#2`
     */
    buildCarried<
        S extends CarrySighting,
        O extends { operationId: string; operationNumber: string },
    >(params: { sightings: S[]; operations: O[] }): S[] {
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
                const operation = params.operations.find(
                    (o) => o.operationNumber === number,
                );
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
                this.carriedPlacements.set(carried, {
                    itinerary,
                    start: runStartOf(run),
                });
                out.push(carried);
            }
        }
        return out;
    }

    /**
     * 編成ごとの、行程への訪問の並び（時刻順）。同じ行程で続けて目撃されたあいだを 1 回の訪問とし、
     * 別の行程・枠の無い運番（休車 100 など）で目撃されたら次の訪問に替わる。first は訪問の最初の目撃の秒
     */
    private visitsOf(
        sightings: CarrySighting[],
    ): Map<
        string,
        { itinerary: VehicleItinerary | undefined; first: number }[]
    > {
        const cached = this.visitsCache.get(sightings);
        if (cached) return cached;
        const out = new Map<
            string,
            { itinerary: VehicleItinerary | undefined; first: number }[]
        >();
        for (const s of [...sightings].sort(compareSightings)) {
            const formationId = formationIdOf(s);
            if (!formationId) continue;
            const itinerary = this.placementOf(s)?.itinerary;
            const visits = out.get(formationId) ?? [];
            out.set(formationId, visits);
            const last = visits[visits.length - 1];
            if (!last || last.itinerary !== itinerary)
                visits.push({ itinerary, first: secondsOf(s.sightingTime) });
        }
        this.visitsCache.set(sightings, out);
        return out;
    }

    /**
     * 過去の運用情報で並べるキー [その編成がその行程に入った秒, 枠の始まりの秒]（鉄道日の 0 時から）。
     * 同じ行程の中は受け持つ順、行程をまたぐときは目撃の順に並ぶ（枠の始まりだけで比べると、
     * 早くから始まる別の行程の枠が前に来て逆転する）。同じ行程に 2 回入ったら、それぞれの訪問の時刻で並ぶ
     * （I → J → I なら I の 2 回目は J の後ろ）。行程表で引けなければ [目撃の時刻, 目撃の時刻]。
     * 直接の目撃は運用を join していないことがあるので、運番は呼び出し側が渡す。sightings はその鉄道日の材料の目撃
     */
    orderOf(
        s: CarrySighting,
        operationNumber: string,
        sightings: CarrySighting[],
    ): [number, number] {
        const own = secondsOf(s.sightingTime);
        const carried = this.carriedPlacements.get(s);
        let at = carried;
        if (!at) {
            const segment = this.itineraries.segmentOfSightingAt(
                operationNumber,
                own,
            );
            const itinerary = segment
                ? this.itineraries.itineraryOf(segment.id)
                : undefined;
            const run = segment ? itinerary?.runOf(segment) : undefined;
            if (!itinerary || !run) return [own, own];
            at = { itinerary, start: runStartOf(run) };
        }
        const formationId = formationIdOf(s);
        const visits = (
            (formationId && this.visitsOf(sightings).get(formationId)) ||
            []
        ).filter((v) => v.itinerary === at.itinerary);
        // 引き継いだ目撃は枠の始まり、直接の目撃は自分の時刻までに入った訪問。無ければ最初の訪問
        const time = carried ? carried.start : own;
        const visit =
            [...visits].reverse().find((v) => v.first <= time) ?? visits[0];
        if (!visit) return [own, at.start];
        // 無効化した直接の目撃は材料に入らないことがあるので、自分の時刻も見る
        return [carried ? visit.first : Math.min(visit.first, own), at.start];
    }
}
