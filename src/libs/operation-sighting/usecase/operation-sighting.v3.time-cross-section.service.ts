import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { getBaseDate } from '../../../core/utils/datetime.js';
import {
    parseFieldsOnly,
    type Selection,
} from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { CalendarQuery } from '../../calendar/infrastructure/queries/calendar.query.js';
import { FormationQuery } from '../../formation/infrastructure/queries/formation.query.js';
import { VehicleItineraryReadModel } from '../../operation/usecase/read-models/vehicle-itinerary.read-model.js';
import { ItinerarySegmentQuery } from '../../operation/infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import {
    buildCirculationPath,
    getGroupMembers,
    operationNumberCirculateReverseMap,
} from '../../operation/usecase/operation-number-circulation.js';
import { OperationSightingLatestCacheQuery } from '../infrastructure/queries/operation-sighting-latest-cache.query.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto.js';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto.js';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto.js';
import { selectMostRecentCandidateForOperationNumber } from './operation-sighting.v3.circulation.js';
import { OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE } from './operation-sighting-time-cross-section-selection.js';
import { SightingCarryOver } from './read-models/sighting-carry-over.read-model.js';

/** 時刻断面の判定が読む DB の口。1 件ずつの口とまとめて返す口とで読み方だけを替える。 */
interface TimeCrossSectionSource {
    latestByOperationNumber(
        operationNumber: string,
    ): Promise<OperationSightingDetailsDto | null>;
    latestByFormationNumber(
        formationNumber: string,
    ): Promise<OperationSightingDetailsDto | null>;
    calendar(): ReturnType<CalendarQuery['findOneBySpecificDate']>;
    formationLatestCache(
        formationNumber: string,
    ): Promise<OperationSightingLatestCacheDto | null>;
    groupMemberCaches(
        operationNumbers: string[],
        startTime: dayjs.Dayjs,
    ): Promise<OperationSightingLatestCacheDto[]>;
    formationsOn(
        date: string,
    ): ReturnType<FormationQuery['findManyBySpecificPeriod']>;
    operationsOf(
        calendarId: string,
    ): ReturnType<OperationQuery['findManyByCalendarId']>;
    itineraries(calendarId: string): Promise<VehicleItineraryReadModel>;
    /** その鉄道日の 4 時から検索時刻までの有効な目撃 */
    todaySightings(): Promise<OperationSightingDetailsDto[]>;
}

@Injectable()
export class OperationSightingV3TimeCrossSectionService {
    constructor(
        private readonly operationSightingLatestCacheQuery: OperationSightingLatestCacheQuery,
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly calendarQuery: CalendarQuery,
        private readonly operationQuery: OperationQuery,
        private readonly formationQuery: FormationQuery,
        private readonly itinerarySegmentQuery: ItinerarySegmentQuery,
    ) {}

    /**
     * 複数の運用番号の時刻断面をまとめて返す（リアルタイム運用情報用。運用番号ごとの
     * /time-cross-section/operation-number/:n を束ねる）。キーは運用番号。
     * 判定は 1 件ずつの口と同じで、DB の読み方だけを「先にまとめて引いて表から取る」に替える。
     * 時刻は全件で同じ瞬間にそろえる。休車の 100 は 1 件ずつの口と同じく扱えないので省く。
     * `fields` があれば選んだ項目だけを返す（read-model なので include は受けない。docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        searchTime?: string;
        include?: undefined;
        fields?: undefined;
    }): Promise<Record<string, OperationSightingTimeCrossSectionDto>>;
    async findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    >;
    async findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    > {
        const tree = OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);
        const searchTimeInstance = params.searchTime
            ? dayjs(params.searchTime)
            : dayjs();
        const operationNumbers = params.operationNumbers.filter(
            (o) => o !== '100',
        );
        const source = await this.#createBulkSource(searchTimeInstance, {
            operationNumbers,
        });

        const entries = [];
        for (const operationNumber of operationNumbers) {
            entries.push([
                operationNumber,
                await this.#timeCrossSectionByOperationNumber(
                    operationNumber,
                    searchTimeInstance,
                    source,
                ),
            ] as const);
        }
        return this.#serializeTimeCrossSections(
            Object.fromEntries(entries),
            selection,
        );
    }

    /**
     * 複数の編成番号の時刻断面をまとめて返す（編成番号ごとの口を束ねる）。キーは編成番号。
     * `fields` があれば選んだ項目だけを返す（include は受けない。docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        searchTime?: string;
        include?: undefined;
        fields?: undefined;
    }): Promise<Record<string, OperationSightingTimeCrossSectionDto>>;
    async findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    >;
    async findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        Record<
            string,
            OperationSightingTimeCrossSectionDto | Record<string, unknown>
        >
    > {
        const tree = OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);
        const searchTimeInstance = params.searchTime
            ? dayjs(params.searchTime)
            : dayjs();
        const { formationNumbers } = params;
        const source = await this.#createBulkSource(searchTimeInstance, {
            formationNumbers,
        });

        const entries = [];
        for (const formationNumber of formationNumbers) {
            entries.push([
                formationNumber,
                await this.#timeCrossSectionByFormationNumber(
                    formationNumber,
                    searchTimeInstance,
                    source,
                ),
            ] as const);
        }
        return this.#serializeTimeCrossSections(
            Object.fromEntries(entries),
            selection,
        );
    }

    /** 時刻断面のまとめを `fields` で選んだ項目だけにする。選びが無ければそのまま返す。 */
    #serializeTimeCrossSections(
        result: Record<string, OperationSightingTimeCrossSectionDto>,
        selection: Selection | undefined,
    ): Record<
        string,
        OperationSightingTimeCrossSectionDto | Record<string, unknown>
    > {
        if (!selection) {
            return result;
        }
        const tree = OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE;
        return Object.fromEntries(
            Object.entries(result).map(([key, value]) => [
                key,
                serializeSelection(value, tree, selection),
            ]),
        );
    }

    /** `fields` があれば選んだ項目だけを返す（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    async findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        searchTime?: string;
        include?: undefined;
        fields?: undefined;
    }): Promise<OperationSightingTimeCrossSectionDto>;
    async findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationSightingTimeCrossSectionDto | Record<string, unknown>>;
    async findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        OperationSightingTimeCrossSectionDto | Record<string, unknown>
    > {
        const { operationNumber, searchTime } = params;
        const tree = OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);

        if (operationNumber === '100') {
            throw new UseCaseError(
                '停車中の運用の検索はサポートされていません',
                {
                    operationNumber,
                    reason: 'suspended_operation',
                },
            );
        }

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const result = await this.#timeCrossSectionByOperationNumber(
            operationNumber,
            searchTimeInstance,
            this.#createDirectSource(searchTimeInstance),
        );
        return selection ? serializeSelection(result, tree, selection) : result;
    }

    /** `fields` があれば選んだ項目だけを返す（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
        include?: undefined;
        fields?: undefined;
    }): Promise<OperationSightingTimeCrossSectionDto>;
    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationSightingTimeCrossSectionDto | Record<string, unknown>>;
    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<
        OperationSightingTimeCrossSectionDto | Record<string, unknown>
    > {
        const { formationNumber, searchTime } = params;
        const tree = OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const result = await this.#timeCrossSectionByFormationNumber(
            formationNumber,
            searchTimeInstance,
            this.#createDirectSource(searchTimeInstance),
        );
        return selection ? serializeSelection(result, tree, selection) : result;
    }

    async #timeCrossSectionByOperationNumber(
        operationNumber: string,
        searchTimeInstance: dayjs.Dayjs,
        source: TimeCrossSectionSource,
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const searchBaseDate = getBaseDate(searchTimeInstance);

        const [latestSighting, calendar] = await Promise.all([
            source.latestByOperationNumber(operationNumber),
            source.calendar(),
        ]);

        if (calendar) {
            const [itineraries, sightings] = await Promise.all([
                source.itineraries(calendar.id),
                source.todaySightings(),
            ]);
            const carried = SightingCarryOver.create(
                itineraries,
            ).resolveForOperation({
                sightings,
                operationNumber,
                searchTime: searchTimeInstance,
            });
            if (carried && carried !== 'unsighted') {
                const { sighting, sightedAsOperation } = carried;
                const operations = await source.operationsOf(calendar.id);
                const operation = operations.find(
                    (o) => o.operationNumber === operationNumber,
                );
                // 推測のときは、この運番自身の最後の目撃を返す（元の 17K の目撃で 18K? を太字・赤字にしない。
                // 順送りと同じく、太字・時刻の色はこの運番の目撃で決まる。ユーザー判断 2026-10-19）
                return {
                    latestSighting: sightedAsOperation
                        ? latestSighting
                        : sighting,
                    expectedSighting:
                        sighting.formation && operation
                            ? { operation, formation: sighting.formation }
                            : null,
                    sightedAsOperation,
                };
            }
            // 行程に今日の実目撃があり、この枠は誰にも割り当てられない（spec 3.3）。順送りに戻さない
            if (carried === null) {
                return {
                    latestSighting,
                    expectedSighting: null,
                    sightedAsOperation: null,
                };
            }
            // 行程に今日の実目撃が無い。この運番の今日の目撃が別の行程のものなら出さない
            if (
                carried === 'unsighted' &&
                latestSighting &&
                searchBaseDate.isSame(
                    getBaseDate(dayjs(latestSighting.sightingTime)),
                )
            ) {
                return {
                    latestSighting,
                    expectedSighting: null,
                    sightedAsOperation: null,
                };
            }
        }

        if (!latestSighting) {
            return { latestSighting: null, expectedSighting: null };
        }

        const latestSightingBaseDate = getBaseDate(
            dayjs(latestSighting.sightingTime),
        );

        if (searchBaseDate.isSame(latestSightingBaseDate)) {
            const { operation, formation } = latestSighting;
            if (!operation || !formation) {
                return { latestSighting, expectedSighting: null };
            }
            // 編成の最新目撃キャッシュが別運用を指している場合、この編成は追い出されている
            const formationLatestCache = await source.formationLatestCache(
                formation.formationNumber,
            );
            if (
                !formationLatestCache ||
                formationLatestCache.operationNumber !== operationNumber
            ) {
                return { latestSighting, expectedSighting: null };
            }
            return {
                latestSighting,
                expectedSighting: { operation, formation },
            };
        }

        if (!calendar) {
            return { latestSighting, expectedSighting: null };
        }

        // ダイヤ改正日より前の目撃は群の循環に使えないため除外する下限として使う
        const calendarStartDate = dayjs(calendar.startDate, 'YYYY-MM-DD');
        // operationNumber と同じ循環群に属するすべての運用番号を列挙する（逆順マップで群を遡る）
        const groupOperationNumbers = getGroupMembers(
            operationNumber,
            operationNumberCirculateReverseMap,
        );

        // 群メンバー全員の最新キャッシュ行を一括取得（ダイヤ改正日以降 ～ 検索時刻）
        const groupMemberCaches = await source.groupMemberCaches(
            groupOperationNumbers,
            calendarStartDate,
        );

        // 各キャッシュ行を「目撃から今日まで k 日分だけ前進させると operationNumber に届くか」で絞り込み、最新を選択
        const selectedCandidate = selectMostRecentCandidateForOperationNumber(
            groupMemberCaches,
            operationNumber,
            searchBaseDate,
        );

        if (!selectedCandidate) {
            return { latestSighting, expectedSighting: null };
        }

        const formations = await source.formationsOn(
            searchBaseDate.format('YYYY-MM-DD'),
        );
        const formation =
            formations.find(
                (f) => f.formationNumber === selectedCandidate.formationNumber,
            ) ?? null;
        return {
            latestSighting,
            expectedSighting:
                formation && latestSighting.operation
                    ? { operation: latestSighting.operation, formation }
                    : null,
        };
    }

    async #timeCrossSectionByFormationNumber(
        formationNumber: string,
        searchTimeInstance: dayjs.Dayjs,
        source: TimeCrossSectionSource,
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const searchBaseDate = getBaseDate(searchTimeInstance);

        const [latestSighting, calendar] = await Promise.all([
            source.latestByFormationNumber(formationNumber),
            source.calendar(),
        ]);

        if (calendar) {
            const [itineraries, sightings] = await Promise.all([
                source.itineraries(calendar.id),
                source.todaySightings(),
            ]);
            const carried = SightingCarryOver.create(
                itineraries,
            ).resolveForFormation({
                sightings,
                formationNumber,
                searchTime: searchTimeInstance,
            });
            if (carried) {
                const operations = await source.operationsOf(calendar.id);
                const operation =
                    operations.find(
                        (o) => o.operationNumber === carried.operationNumber,
                    ) ?? null;
                return {
                    latestSighting: carried.sighting,
                    expectedSighting:
                        operation && carried.sighting.formation
                            ? {
                                  operation,
                                  formation: carried.sighting.formation,
                              }
                            : null,
                    sightedAsOperation: carried.sightedAsOperation,
                };
            }
            if (carried === null) {
                return {
                    latestSighting,
                    expectedSighting: null,
                    sightedAsOperation: null,
                };
            }
        }

        if (!latestSighting) {
            return { latestSighting: null, expectedSighting: null };
        }

        const latestSightingBaseDate = getBaseDate(
            dayjs(latestSighting.sightingTime),
        );

        if (searchBaseDate.isSame(latestSightingBaseDate)) {
            const { operation, formation } = latestSighting;
            if (!operation || !formation) {
                return { latestSighting, expectedSighting: null };
            }
            // その運用のより新しい目撃が別編成によるものなら、この編成は追い出されている
            const operationLatestCache = await source.latestByOperationNumber(
                operation.operationNumber,
            );
            if (
                operationLatestCache?.formation?.formationNumber !==
                formation.formationNumber
            ) {
                return { latestSighting, expectedSighting: null };
            }
            return {
                latestSighting,
                expectedSighting: { operation, formation },
            };
        }

        const latestOperation = latestSighting.operation;
        if (!latestOperation) {
            return { latestSighting, expectedSighting: null };
        }

        // 休車（100番）は循環マップに定義がないため追跡不可、そのまま返す
        if (latestOperation.operationNumber === '100') {
            return {
                latestSighting,
                expectedSighting: latestSighting.formation
                    ? {
                          formation: latestSighting.formation,
                          operation: latestOperation,
                      }
                    : null,
            };
        }

        if (!calendar) {
            return { latestSighting, expectedSighting: null };
        }

        // ダイヤ改正日（calendar.startDate の鉄道日0時）
        const calendarStartDate = dayjs(calendar.startDate, 'YYYY-MM-DD');

        // 最新目撃がダイヤ改正より前の鉄道日なら、現在の循環ルールで追跡できないため終了
        if (latestSightingBaseDate.isBefore(calendarStartDate)) {
            return { latestSighting, expectedSighting: null };
        }

        // 最新目撃から今日の鉄道日まで何日経過しているか
        const daysSinceSighting = searchBaseDate.diff(
            latestSightingBaseDate,
            'day',
        );

        // 最新目撃の運用番号から daysSinceSighting 回前進した先の運用番号を計算する
        const circulation = buildCirculationPath(
            latestOperation.operationNumber,
            daysSinceSighting,
        );

        if (!circulation) {
            return { latestSighting, expectedSighting: null };
        }

        // 期待運用番号に到達しうる群メンバー全員の最新キャッシュを一括取得（運用番号側と対称な構造）
        const groupOperationNumbers = getGroupMembers(
            circulation.expectedOperationNumber,
            operationNumberCirculateReverseMap,
        );
        const groupMemberCaches = await source.groupMemberCaches(
            groupOperationNumbers,
            calendarStartDate,
        );

        // 期待運用番号に今日到達できる候補を絞り込み、最も新しい目撃を持つ行を選択
        const selectedCandidate = selectMostRecentCandidateForOperationNumber(
            groupMemberCaches,
            circulation.expectedOperationNumber,
            searchBaseDate,
        );

        if (!selectedCandidate) {
            return { latestSighting, expectedSighting: null };
        }

        // 最新候補が自編成でなければ追い出されている
        if (selectedCandidate.formationNumber !== formationNumber) {
            return { latestSighting, expectedSighting: null };
        }

        const operations = await source.operationsOf(calendar.id);
        const operation =
            operations.find(
                (o) =>
                    o.operationNumber === circulation.expectedOperationNumber,
            ) ?? null;
        return {
            latestSighting,
            expectedSighting:
                operation && latestSighting.formation
                    ? { formation: latestSighting.formation, operation }
                    : null,
        };
    }

    /** 1 件ずつの口の読み方。呼ばれるたびにそのまま問い合わせる。 */
    #createDirectSource(
        searchTimeInstance: dayjs.Dayjs,
    ): TimeCrossSectionSource {
        return {
            latestByOperationNumber: (operationNumber) =>
                this.operationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime(
                    { operationNumber, sightingTime: searchTimeInstance },
                ),
            latestByFormationNumber: (formationNumber) =>
                this.operationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime(
                    { formationNumber, sightingTime: searchTimeInstance },
                ),
            calendar: () =>
                this.calendarQuery.findOneBySpecificDate({
                    date: getBaseDate(searchTimeInstance).format('YYYY-MM-DD'),
                }),
            formationLatestCache: (formationNumber) =>
                this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                    { formationNumber },
                ),
            groupMemberCaches: (operationNumbers, startTime) =>
                this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange(
                    {
                        operationNumbers,
                        startTime,
                        endTime: searchTimeInstance,
                    },
                ),
            formationsOn: (date) =>
                this.formationQuery.findManyBySpecificPeriod({
                    startDate: date,
                    endDate: date,
                }),
            operationsOf: (calendarId) =>
                this.operationQuery.findManyByCalendarId({ calendarId }),
            itineraries: (calendarId) =>
                this.itinerarySegmentQuery
                    .findManyByCalendarId({ calendarId })
                    .then((segments) =>
                        VehicleItineraryReadModel.create(segments),
                    ),
            todaySightings: () =>
                this.operationSightingQuery.findManyBySightingTimeRange({
                    start: getBaseDate(searchTimeInstance).hour(4),
                    end: searchTimeInstance,
                }),
        };
    }

    /**
     * まとめて返す口の読み方。対象の番号の最新目撃（と、判定で次に要る側の最新目撃・キャッシュ）を
     * 先に 1 回ずつの問い合わせで引いて表にし、残り（ダイヤ・群のキャッシュ・編成一覧・運用一覧）は
     * 同じ引数なら 1 回だけ問い合わせる。表に無い番号は 1 件ずつの読み方にフォールバックする。
     */
    async #createBulkSource(
        searchTimeInstance: dayjs.Dayjs,
        keys: { operationNumbers: string[] } | { formationNumbers: string[] },
    ): Promise<TimeCrossSectionSource> {
        const direct = this.#createDirectSource(searchTimeInstance);
        const opLatest = new Map<
            string,
            Promise<OperationSightingDetailsDto | null>
        >();
        const fmLatest = new Map<
            string,
            Promise<OperationSightingDetailsDto | null>
        >();
        const fmCache = new Map<
            string,
            Promise<OperationSightingLatestCacheDto | null>
        >();
        const fill = <V>(
            target: Map<string, Promise<V | null>>,
            requested: string[],
            found: Map<string, V>,
        ) => {
            for (const key of requested) {
                target.set(key, Promise.resolve(found.get(key) ?? null));
            }
        };
        const unique = (values: (string | undefined)[]) => [
            ...new Set(values.filter((o): o is string => !!o)),
        ];

        if ('operationNumbers' in keys) {
            const found =
                await this.operationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime(
                    {
                        operationNumbers: keys.operationNumbers,
                        sightingTime: searchTimeInstance,
                    },
                );
            fill(opLatest, keys.operationNumbers, found);
            const formationNumbers = unique(
                [...found.values()].map((o) => o.formation?.formationNumber),
            );
            fill(
                fmCache,
                formationNumbers,
                await this.operationSightingLatestCacheQuery.findManyByFormationNumbers(
                    { formationNumbers },
                ),
            );
        } else {
            const found =
                await this.operationSightingQuery.findManyLatestByFormationNumbersAndBeforeSightingTime(
                    {
                        formationNumbers: keys.formationNumbers,
                        sightingTime: searchTimeInstance,
                    },
                );
            fill(fmLatest, keys.formationNumbers, found);
            const operationNumbers = unique(
                [...found.values()].map((o) => o.operation?.operationNumber),
            );
            fill(
                opLatest,
                operationNumbers,
                await this.operationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime(
                    { operationNumbers, sightingTime: searchTimeInstance },
                ),
            );
        }

        const memo = <V>(
            cache: Map<string, Promise<V>>,
            key: string,
            load: () => Promise<V>,
        ) => {
            let hit = cache.get(key);
            if (!hit) {
                hit = load();
                cache.set(key, hit);
            }
            return hit;
        };
        const calendars = new Map<
            string,
            ReturnType<TimeCrossSectionSource['calendar']>
        >();
        const groups = new Map<
            string,
            Promise<OperationSightingLatestCacheDto[]>
        >();
        const formations = new Map<
            string,
            ReturnType<TimeCrossSectionSource['formationsOn']>
        >();
        const operations = new Map<
            string,
            ReturnType<TimeCrossSectionSource['operationsOf']>
        >();
        const itineraryCache = new Map<
            string,
            Promise<VehicleItineraryReadModel>
        >();
        const todayCache = new Map<
            string,
            Promise<OperationSightingDetailsDto[]>
        >();

        return {
            latestByOperationNumber: (n) =>
                memo(opLatest, n, () => direct.latestByOperationNumber(n)),
            latestByFormationNumber: (n) =>
                memo(fmLatest, n, () => direct.latestByFormationNumber(n)),
            calendar: () => memo(calendars, '', () => direct.calendar()),
            formationLatestCache: (n) =>
                memo(fmCache, n, () => direct.formationLatestCache(n)),
            groupMemberCaches: (operationNumbers, startTime) =>
                // 群の並び順は起点の番号で変わるが、結果は番号の集合で決まるので並べてキーにする
                memo(
                    groups,
                    `${[...operationNumbers].sort().join(',')}|${startTime.valueOf()}`,
                    () => direct.groupMemberCaches(operationNumbers, startTime),
                ),
            formationsOn: (date) =>
                memo(formations, date, () => direct.formationsOn(date)),
            operationsOf: (calendarId) =>
                memo(operations, calendarId, () =>
                    direct.operationsOf(calendarId),
                ),
            itineraries: (calendarId) =>
                memo(itineraryCache, calendarId, () =>
                    direct.itineraries(calendarId),
                ),
            todaySightings: () =>
                memo(todayCache, '', () => direct.todaySightings()),
        };
    }
}
