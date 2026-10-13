import dayjs from 'dayjs';
import { getBaseDate } from 'src/core/utils/datetime';
import {
    VehicleItineraryReadModel,
    VehicleItinerary,
} from 'src/libs/operation/usecase/read-models/vehicle-itinerary.read-model';

/**
 * 目撃の引き継ぎ（spec 4.6）。規則はここ 1 か所に集める。
 * 同じ行程表に入っている区間は同じ編成として扱う（両向き）。
 * 目撃は「その時刻にその運番を受け持っていた区間」に結び付ける（itineraryOfSighting）。
 * 直接の目撃が優先で、同じ編成がより新しく別の行程表で目撃されていたら追い出される。
 * undefined は「行程表で判定できない（今日の区間・目撃が無い）」で、呼び出し側は今の判定へ落とす。
 */
export type SightedAsOperation = {
    operationId: string;
    operationNumber: string;
};

/** 引き継ぎの規則が見る目撃の最小の形（usecase の DTO はこれを満たす） */
export interface CarrySighting {
    id: string;
    operationSightingId: string;
    operationId: string;
    sightingTime: Date;
    operation?: { operationNumber: string } | null;
    formation?: { formationNumber: string } | null;
}

const secondsOf = (time: Date) => {
    const t = dayjs(time);
    return t.diff(getBaseDate(t), 'second');
};

/** 検索時刻までの目撃を新しい順に */
const usable = <S extends CarrySighting>(
    sightings: S[],
    searchTime: dayjs.Dayjs,
): S[] =>
    sightings
        .filter((s) => !dayjs(s.sightingTime).isAfter(searchTime))
        .sort(
            (a, b) =>
                dayjs(b.sightingTime).valueOf() -
                dayjs(a.sightingTime).valueOf(),
        );

const sightedAs = (
    s: CarrySighting,
    operationNumber: string,
): SightedAsOperation | null =>
    s.operation && s.operation.operationNumber !== operationNumber
        ? {
              operationId: s.operationId,
              operationNumber: s.operation.operationNumber,
          }
        : null;

export class SightingCarryOver {
    private constructor(
        private readonly itineraries: VehicleItineraryReadModel,
    ) {}

    static create(itineraries: VehicleItineraryReadModel): SightingCarryOver {
        return new SightingCarryOver(itineraries);
    }

    /** 目撃 → その行程 */
    itineraryOfSighting(s: CarrySighting): VehicleItinerary | undefined {
        const number = s.operation?.operationNumber;
        if (!number) return undefined;
        return this.itineraries.itineraryOfOperationAt(
            number,
            secondsOf(s.sightingTime),
        );
    }

    /** ある運番を、いま受け持っている編成の目撃（直接 or 引き継ぎ）を返す。判定できなければ undefined、いなければ null */
    resolveForOperation<S extends CarrySighting>(params: {
        /** その鉄道日の有効な目撃 */
        sightings: S[];
        operationNumber: string;
        searchTime: dayjs.Dayjs;
    }):
        | { sighting: S; sightedAsOperation: SightedAsOperation | null }
        | null
        | undefined {
        const { operationNumber, searchTime } = params;
        const itinerary = this.itineraries.itineraryOfOperationAt(
            operationNumber,
            secondsOf(searchTime.toDate()),
        );
        if (!itinerary) return undefined;
        const sightings = usable(params.sightings, searchTime);

        const hit = sightings.find(
            (s) => this.itineraryOfSighting(s) === itinerary,
        );
        if (!hit) return null;
        const formationNumber = hit.formation?.formationNumber;
        const latestOfFormation = sightings.find(
            (s) => s.formation?.formationNumber === formationNumber,
        );
        if (
            latestOfFormation &&
            this.itineraryOfSighting(latestOfFormation) !== itinerary
        )
            return null;
        return {
            sighting: hit,
            sightedAsOperation: sightedAs(hit, operationNumber),
        };
    }

    /** ある編成が、いまどの運番を受け持っているか（直接 or 引き継ぎ）。判定できなければ undefined、追い出されていれば null */
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
        const sightings = usable(params.sightings, searchTime);
        const own = sightings.find(
            (s) => s.formation?.formationNumber === formationNumber,
        );
        if (!own) return undefined;
        const itinerary = this.itineraryOfSighting(own);
        if (itinerary === undefined) return undefined;
        const latestInItinerary = sightings.find(
            (s) => this.itineraryOfSighting(s) === itinerary,
        );
        if (latestInItinerary?.formation?.formationNumber !== formationNumber)
            return null;
        const segment = itinerary.segmentAt(secondsOf(searchTime.toDate()));
        if (!segment) return undefined;
        return {
            sighting: own,
            operationNumber: segment.operationNumber,
            sightedAsOperation: sightedAs(own, segment.operationNumber),
        };
    }

    /**
     * 1 鉄道日ぶんの目撃から、同じ行程表のほかの運用への「引き継いだ目撃」を作る（過去の運用情報用）。
     * 同じ編成がその運用で直接目撃されていれば作らない。
     * 履歴は「その目撃の時点」を並べるので、あとから別の編成に追い出されたことは反映しない
     * （追い出しは resolveFor* が検索時刻で判定する）。
     */
    buildCarried<
        S extends CarrySighting,
        O extends { operationId: string; operationNumber: string },
    >(params: { sightings: S[]; operations: O[] }): S[] {
        const { sightings, operations } = params;
        const direct = new Set(
            sightings.map(
                (o) =>
                    `${o.formation?.formationNumber}|${o.operation?.operationNumber}`,
            ),
        );
        const made = new Set<string>();
        const out: S[] = [];
        for (const s of sightings) {
            const number = s.operation?.operationNumber;
            if (!number || !s.formation) continue;
            const itinerary = this.itineraryOfSighting(s);
            if (itinerary === undefined) continue;
            const others = new Set(
                itinerary.segments.map((o) => o.operationNumber),
            );
            others.delete(number);
            for (const other of others) {
                const key = `${s.formation.formationNumber}|${other}`;
                if (direct.has(key) || made.has(key)) continue;
                const operation = operations.find(
                    (o) => o.operationNumber === other,
                );
                if (!operation) continue;
                made.add(key);
                out.push({
                    ...s,
                    id: `${s.id}#${other}`,
                    operationSightingId: `${s.operationSightingId}#${other}`,
                    operationId: operation.operationId,
                    operation,
                    sightedAsOperation: {
                        operationId: s.operationId,
                        operationNumber: number,
                    },
                } as S);
            }
        }
        return out;
    }
}
