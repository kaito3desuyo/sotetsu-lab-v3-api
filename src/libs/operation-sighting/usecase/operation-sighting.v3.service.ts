import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { UseCaseError } from 'src/core/classes/custom-error';
import { UnexpectedError } from 'src/core/classes/unexpected-error';
import { getBaseDate } from 'src/core/utils/datetime';
import { CalendarQuery } from 'src/libs/calendar/infrastructure/queries/calendar.query';
import { FormationQuery } from 'src/libs/formation/infrastructure/queries/formation.query';
import { OperationQuery } from 'src/libs/operation/infrastructure/queries/operation.query';
import {
    buildCirculationPath,
    getGroupMembers,
    operationNumberCirculateReverseMap,
} from 'src/libs/operation/usecase/operation-number-circulation';
import { DataSource, EntityManager } from 'typeorm';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheQuery } from '../infrastructure/queries/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';
import {
    CacheAction,
    selectMostRecentCandidateForOperationNumber,
} from './operation-sighting.v3.circulation';

/** 時刻断面の判定が読む DB の口。1 件ずつの口とまとめて返す口とで読み方だけを替える。 */
interface TimeCrossSectionSource {
    latestByOperationNumber(operationNumber: string): Promise<OperationSightingDetailsDto | null>;
    latestByFormationNumber(formationNumber: string): Promise<OperationSightingDetailsDto | null>;
    calendar(): ReturnType<CalendarQuery['findOneBySpecificDate']>;
    formationLatestCache(formationNumber: string): Promise<OperationSightingLatestCacheDto | null>;
    groupMemberCaches(operationNumbers: string[], startTime: dayjs.Dayjs): Promise<OperationSightingLatestCacheDto[]>;
    formationsOn(date: string): ReturnType<FormationQuery['findManyBySpecificPeriod']>;
    operationsOf(calendarId: string): ReturnType<OperationQuery['findManyByCalendarId']>;
}

@Injectable()
export class OperationSightingV3Service {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingLatestCacheCommand: OperationSightingLatestCacheCommand,
        private readonly operationSightingLatestCacheQuery: OperationSightingLatestCacheQuery,
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly calendarQuery: CalendarQuery,
        private readonly operationQuery: OperationQuery,
        private readonly formationQuery: FormationQuery,
    ) {}

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
    }): Promise<OperationSightingDetailsDto[]> {
        const { start, end, includeInvalidated = false } = params;

        return this.operationSightingQuery.findManyBySpecificPeriod({
            start,
            end,
            includeInvalidated,
        });
    }

    /**
     * 複数の運用番号の時刻断面をまとめて返す（リアルタイム運用情報用。運用番号ごとの
     * /time-cross-section/operation-number/:n を束ねる）。キーは運用番号。
     * 判定は 1 件ずつの口と同じで、DB の読み方だけを「先にまとめて引いて表から取る」に替える。
     * 時刻は全件で同じ瞬間にそろえる。休車の 100 は 1 件ずつの口と同じく扱えないので省く。
     */
    async findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        searchTime?: string;
    }): Promise<Record<string, OperationSightingTimeCrossSectionDto>> {
        const searchTimeInstance = params.searchTime ? dayjs(params.searchTime) : dayjs();
        const operationNumbers = params.operationNumbers.filter((o) => o !== '100');
        const source = await this.#createBulkSource(searchTimeInstance, { operationNumbers });

        const entries = [];
        for (const operationNumber of operationNumbers) {
            entries.push([
                operationNumber,
                await this.#timeCrossSectionByOperationNumber(operationNumber, searchTimeInstance, source),
            ] as const);
        }
        return Object.fromEntries(entries);
    }

    /** 複数の編成番号の時刻断面をまとめて返す（編成番号ごとの口を束ねる）。キーは編成番号。 */
    async findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        searchTime?: string;
    }): Promise<Record<string, OperationSightingTimeCrossSectionDto>> {
        const searchTimeInstance = params.searchTime ? dayjs(params.searchTime) : dayjs();
        const { formationNumbers } = params;
        const source = await this.#createBulkSource(searchTimeInstance, { formationNumbers });

        const entries = [];
        for (const formationNumber of formationNumbers) {
            entries.push([
                formationNumber,
                await this.#timeCrossSectionByFormationNumber(formationNumber, searchTimeInstance, source),
            ] as const);
        }
        return Object.fromEntries(entries);
    }

    async findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        searchTime?: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { operationNumber, searchTime } = params;

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
        return this.#timeCrossSectionByOperationNumber(
            operationNumber,
            searchTimeInstance,
            this.#createDirectSource(searchTimeInstance),
        );
    }

    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, searchTime } = params;

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        return this.#timeCrossSectionByFormationNumber(
            formationNumber,
            searchTimeInstance,
            this.#createDirectSource(searchTimeInstance),
        );
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
            if (!formationLatestCache || formationLatestCache.operationNumber !== operationNumber) {
                return { latestSighting, expectedSighting: null };
            }
            return { latestSighting, expectedSighting: { operation, formation } };
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
            if (operationLatestCache?.formation?.formationNumber !== formation.formationNumber) {
                return { latestSighting, expectedSighting: null };
            }
            return { latestSighting, expectedSighting: { operation, formation } };
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
                (o) => o.operationNumber === circulation.expectedOperationNumber,
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
    #createDirectSource(searchTimeInstance: dayjs.Dayjs): TimeCrossSectionSource {
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
                this.operationSightingLatestCacheQuery.findOneByFormationNumber({ formationNumber }),
            groupMemberCaches: (operationNumbers, startTime) =>
                this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange(
                    { operationNumbers, startTime, endTime: searchTimeInstance },
                ),
            formationsOn: (date) =>
                this.formationQuery.findManyBySpecificPeriod({ startDate: date, endDate: date }),
            operationsOf: (calendarId) => this.operationQuery.findManyByCalendarId({ calendarId }),
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
        const opLatest = new Map<string, Promise<OperationSightingDetailsDto | null>>();
        const fmLatest = new Map<string, Promise<OperationSightingDetailsDto | null>>();
        const fmCache = new Map<string, Promise<OperationSightingLatestCacheDto | null>>();
        const fill = <V>(target: Map<string, Promise<V | null>>, requested: string[], found: Map<string, V>) => {
            for (const key of requested) {
                target.set(key, Promise.resolve(found.get(key) ?? null));
            }
        };
        const unique = (values: (string | undefined)[]) => [
            ...new Set(values.filter((o): o is string => !!o)),
        ];

        if ('operationNumbers' in keys) {
            const found = await this.operationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime(
                { operationNumbers: keys.operationNumbers, sightingTime: searchTimeInstance },
            );
            fill(opLatest, keys.operationNumbers, found);
            const formationNumbers = unique([...found.values()].map((o) => o.formation?.formationNumber));
            fill(
                fmCache,
                formationNumbers,
                await this.operationSightingLatestCacheQuery.findManyByFormationNumbers({ formationNumbers }),
            );
        } else {
            const found = await this.operationSightingQuery.findManyLatestByFormationNumbersAndBeforeSightingTime(
                { formationNumbers: keys.formationNumbers, sightingTime: searchTimeInstance },
            );
            fill(fmLatest, keys.formationNumbers, found);
            const operationNumbers = unique([...found.values()].map((o) => o.operation?.operationNumber));
            fill(
                opLatest,
                operationNumbers,
                await this.operationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime(
                    { operationNumbers, sightingTime: searchTimeInstance },
                ),
            );
        }

        const memo = <V>(cache: Map<string, Promise<V>>, key: string, load: () => Promise<V>) => {
            let hit = cache.get(key);
            if (!hit) {
                hit = load();
                cache.set(key, hit);
            }
            return hit;
        };
        const calendars = new Map<string, ReturnType<TimeCrossSectionSource['calendar']>>();
        const groups = new Map<string, Promise<OperationSightingLatestCacheDto[]>>();
        const formations = new Map<string, ReturnType<TimeCrossSectionSource['formationsOn']>>();
        const operations = new Map<string, ReturnType<TimeCrossSectionSource['operationsOf']>>();

        return {
            latestByOperationNumber: (n) => memo(opLatest, n, () => direct.latestByOperationNumber(n)),
            latestByFormationNumber: (n) => memo(fmLatest, n, () => direct.latestByFormationNumber(n)),
            calendar: () => memo(calendars, '', () => direct.calendar()),
            formationLatestCache: (n) => memo(fmCache, n, () => direct.formationLatestCache(n)),
            groupMemberCaches: (operationNumbers, startTime) =>
                // 群の並び順は起点の番号で変わるが、結果は番号の集合で決まるので並べてキーにする
                memo(groups, `${[...operationNumbers].sort().join(',')}|${startTime.valueOf()}`, () =>
                    direct.groupMemberCaches(operationNumbers, startTime),
                ),
            formationsOn: (date) => memo(formations, date, () => direct.formationsOn(date)),
            operationsOf: (calendarId) => memo(operations, calendarId, () => direct.operationsOf(calendarId)),
        };
    }

    async post(
        params: PostOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { agencyId, formationOrVehicleNumber } = params;
        const { sightingTimeInstance, sightingTimeInJst, date } =
            this.#parseSightingTime(params);
        const { operation } = await this.#resolveOperationContext(
            params,
            date,
            sightingTimeInJst,
        );

        const formation =
            (await this.formationQuery.findOneByAgencyIdAndFormationNumberAndDate(
                { agencyId, formationNumber: formationOrVehicleNumber, date },
            )) ??
            (await this.formationQuery.findOneByAgencyIdAndVehicleNumberAndDate(
                { agencyId, vehicleNumber: formationOrVehicleNumber, date },
            ));
        if (!formation) {
            throw new UseCaseError(
                '入力された編成番号/車両番号に対応する編成が見つかりません',
                {
                    agencyId,
                    formationOrVehicleNumber,
                    date,
                    reason: 'formation_not_found',
                },
            );
        }

        const domain = OperationSightingDomainBuilder.buildFromCreateDto({
            id: undefined,
            formationId: formation.id,
            operationId: operation.id,
            sightingTime: sightingTimeInstance.toDate(),
        });

        const currentCache =
            await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                { formationNumber: formation.formationNumber },
            );
        const cacheAction: CacheAction =
            !currentCache ||
            dayjs(currentCache.sightingTime).isBefore(sightingTimeInstance)
                ? {
                      type: 'upsert',
                      cacheId: currentCache?.id,
                      formationNumber: formation.formationNumber,
                      operationNumber: operation.operationNumber,
                  }
                : { type: 'none' };

        return this.dataSource.transaction(async (manager) => {
            const saved = await this.operationSightingCommand.save(
                domain,
                manager,
            );
            await this.#applyCacheAction(
                cacheAction,
                saved.operationSightingId,
                manager,
            );
            return saved;
        });
    }

    async invalidate(
        params: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new UseCaseError('目撃情報が見つかりません', {
                operationSightingId,
                reason: 'not_found',
            });
        }

        const domain = OperationSightingDomainBuilder.buildFromDetailsDto(dto);

        domain.invalidate(userId, reason);

        if (!dto.formation?.formationNumber) {
            throw new UnexpectedError('目撃情報に編成情報が存在しない', {
                operationSightingId,
            });
        }
        const formationNumber = dto.formation.formationNumber;

        const currentCache =
            await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                { formationNumber },
            );
        let cacheAction: CacheAction = { type: 'none' };
        if (currentCache?.operationSightingId === operationSightingId) {
            const prevSighting =
                await this.operationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime(
                    {
                        formationNumber,
                        sightingTime: dayjs(dto.sightingTime).subtract(1, 'ms'),
                    },
                );
            if (!prevSighting) {
                cacheAction = {
                    type: 'delete',
                    domain: OperationSightingLatestCache.create(
                        {
                            operationSightingId:
                                currentCache.operationSightingId,
                            operationNumber: currentCache.operationNumber,
                            formationNumber: currentCache.formationNumber,
                        },
                        new UniqueEntityId(currentCache.id),
                    ),
                };
            } else if (!prevSighting.operation?.operationNumber) {
                throw new UnexpectedError(
                    '直前目撃情報に運用情報が存在しない',
                    {
                        operationSightingId,
                        prevSightingId: prevSighting.operationSightingId,
                    },
                );
            } else {
                cacheAction = {
                    type: 'rollback',
                    cacheId: currentCache.id,
                    formationNumber,
                    operationNumber: prevSighting.operation.operationNumber,
                    operationSightingId: prevSighting.operationSightingId,
                };
            }
        }

        return this.dataSource.transaction(async (manager) => {
            const saved = await this.operationSightingCommand.save(
                domain,
                manager,
            );
            await this.#applyCacheAction(
                cacheAction,
                saved.operationSightingId,
                manager,
            );
            return saved;
        });
    }

    async restore(
        params: RestoreOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const { operationSightingId, userId, reason } = params;

        const dto = await this.operationSightingQuery.findOneById({
            id: operationSightingId,
        });

        if (!dto) {
            throw new UseCaseError('目撃情報が見つかりません', {
                operationSightingId,
                reason: 'not_found',
            });
        }

        const domain = OperationSightingDomainBuilder.buildFromDetailsDto(dto);

        domain.restore(userId, reason);

        if (!dto.formation?.formationNumber) {
            throw new UnexpectedError('目撃情報に編成情報が存在しない', {
                operationSightingId,
            });
        }
        if (!dto.operation?.operationNumber) {
            throw new UnexpectedError('目撃情報に運用情報が存在しない', {
                operationSightingId,
            });
        }
        const formationNumber = dto.formation.formationNumber;
        const operationNumber = dto.operation.operationNumber;

        const currentCache =
            await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                { formationNumber },
            );
        const cacheAction: CacheAction =
            !currentCache ||
            dayjs(currentCache.sightingTime).isBefore(dayjs(dto.sightingTime))
                ? {
                      type: 'upsert',
                      cacheId: currentCache?.id,
                      formationNumber,
                      operationNumber,
                  }
                : { type: 'none' };

        return this.dataSource.transaction(async (manager) => {
            const saved = await this.operationSightingCommand.save(
                domain,
                manager,
            );
            await this.#applyCacheAction(
                cacheAction,
                saved.operationSightingId,
                manager,
            );
            return saved;
        });
    }

    async #applyCacheAction(
        action: CacheAction,
        savedOperationSightingId: string,
        manager: EntityManager,
    ): Promise<void> {
        if (action.type === 'upsert') {
            await this.operationSightingLatestCacheCommand.save(
                OperationSightingLatestCache.create(
                    {
                        formationNumber: action.formationNumber,
                        operationSightingId: savedOperationSightingId,
                        operationNumber: action.operationNumber,
                    },
                    action.cacheId
                        ? new UniqueEntityId(action.cacheId)
                        : undefined,
                ),
                manager,
            );
        } else if (action.type === 'rollback') {
            await this.operationSightingLatestCacheCommand.save(
                OperationSightingLatestCache.create(
                    {
                        formationNumber: action.formationNumber,
                        operationSightingId: action.operationSightingId,
                        operationNumber: action.operationNumber,
                    },
                    new UniqueEntityId(action.cacheId),
                ),
                manager,
            );
        } else if (action.type === 'delete') {
            await this.operationSightingLatestCacheCommand.remove(
                action.domain,
                manager,
            );
        }
    }

    #parseSightingTime(params: PostOperationSightingDto): {
        sightingTimeInstance: dayjs.Dayjs;
        sightingTimeInJst: dayjs.Dayjs;
        date: string;
    } {
        const {
            agencyId,
            formationOrVehicleNumber,
            operationNumber,
            sightingTime,
        } = params;
        if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(sightingTime)) {
            throw new UseCaseError('目撃時刻の形式が正しくありません', {
                agencyId,
                formationOrVehicleNumber,
                operationNumber,
                sightingTime,
                reason: 'offset_missing',
            });
        }
        const sightingTimeInstance = dayjs.utc(sightingTime);
        if (!sightingTimeInstance.isValid()) {
            throw new UseCaseError('目撃時刻の形式が正しくありません', {
                agencyId,
                formationOrVehicleNumber,
                operationNumber,
                sightingTime,
                reason: 'invalid_datetime',
            });
        }
        if (sightingTimeInstance.isAfter(dayjs.utc())) {
            throw new UseCaseError('未来の時刻は指定できません', {
                agencyId,
                formationOrVehicleNumber,
                operationNumber,
                sightingTime,
                reason: 'future_datetime',
            });
        }
        const sightingTimeInJst = sightingTimeInstance.tz();
        const date = getBaseDate(sightingTimeInJst).format('YYYY-MM-DD');
        return { sightingTimeInstance, sightingTimeInJst, date };
    }

    async #resolveOperationContext(
        params: PostOperationSightingDto,
        date: string,
        sightingTimeInJst: dayjs.Dayjs,
    ) {
        const { agencyId, operationNumber, sightingTime } = params;

        const calendar = await this.calendarQuery.findOneBySpecificDate({
            date,
        });
        if (!calendar) {
            throw new UseCaseError('対象日の運行情報が見つかりません', {
                date,
                agencyId,
                operationNumber,
                sightingTime,
                reason: 'calendar_not_found',
            });
        }

        const operation =
            await this.operationQuery.findOneByCalendarIdAndOperationNumber({
                calendarId: calendar.id,
                operationNumber,
            });
        if (!operation) {
            throw new UseCaseError(
                '指定された運用番号の運用情報が見つかりません',
                {
                    calendarId: calendar.id,
                    operationNumber,
                    date,
                    reason: 'operation_not_found',
                },
            );
        }

        // 休車（100番）は列車を持たず始発時刻が存在しないため、時刻の検証対象外とする
        if (operationNumber === '100') {
            return { calendar, operation };
        }

        const firstDepartureTime =
            await this.operationQuery.findOneFirstDepartureTimeByOperationIdAndDate(
                {
                    operationId: operation.id,
                    date,
                },
            );
        if (!firstDepartureTime) {
            throw new UseCaseError('対象運用の始発時刻を特定できません', {
                operationId: operation.id,
                operationNumber,
                date,
                reason: 'first_departure_not_found',
            });
        }

        if (
            sightingTimeInJst.isBefore(
                firstDepartureTime.subtract(30, 'minute'),
            )
        ) {
            const earliestPostTime = firstDepartureTime
                .subtract(30, 'minute')
                .format('YYYY-MM-DD HH:mm');
            throw new UseCaseError(
                '始発時刻の30分前より前の時刻は投稿できません',
                {
                    operationId: operation.id,
                    operationNumber,
                    sightingTime,
                    sightingTimeJst: sightingTimeInJst.format(),
                    date,
                    earliestPostTime,
                    reason: 'too_early_post',
                },
            );
        }

        return { calendar, operation };
    }
}
