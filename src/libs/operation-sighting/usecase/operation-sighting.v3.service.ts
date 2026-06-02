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
import { DataSource, EntityManager } from 'typeorm';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheQuery } from '../infrastructure/query/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';

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
        const searchBaseDate = getBaseDate(searchTimeInstance);

        const [latestSighting, calendar] = await Promise.all([
            this.operationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime(
                { operationNumber, sightingTime: searchTimeInstance },
            ),
            this.calendarQuery.findOneBySpecificDate({
                date: searchBaseDate.format('YYYY-MM-DD'),
            }),
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
            const formationLatestCache =
                await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                    { formationNumber: formation.formationNumber },
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
        const groupMemberCaches =
            await this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange(
                {
                    operationNumbers: groupOperationNumbers,
                    startTime: calendarStartDate,
                    endTime: searchTimeInstance,
                },
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

        return this.#buildResultWithFormation(
            latestSighting,
            selectedCandidate.formationNumber,
            searchBaseDate,
        );
    }

    async findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
    }): Promise<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, searchTime } = params;

        const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
        const searchBaseDate = getBaseDate(searchTimeInstance);

        const [latestSighting, calendar] = await Promise.all([
            this.operationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime(
                { formationNumber, sightingTime: searchTimeInstance },
            ),
            this.calendarQuery.findOneBySpecificDate({
                date: searchBaseDate.format('YYYY-MM-DD'),
            }),
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
            const operationLatestCache =
                await this.operationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime(
                    { operationNumber: operation.operationNumber, sightingTime: searchTimeInstance },
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
        const groupMemberCaches =
            await this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange(
                {
                    operationNumbers: groupOperationNumbers,
                    startTime: calendarStartDate,
                    endTime: searchTimeInstance,
                },
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

        return this.#buildResultWithOperation(
            latestSighting,
            circulation.expectedOperationNumber,
            calendar,
        );
    }

    async #buildResultWithFormation(
        latestSighting: OperationSightingDetailsDto,
        expectedFormationNumber: string,
        searchBaseDate: dayjs.Dayjs,
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const searchDateString = searchBaseDate.format('YYYY-MM-DD');
        const formations = await this.formationQuery.findManyBySpecificPeriod({
            startDate: searchDateString,
            endDate: searchDateString,
        });
        const formation =
            formations.find(
                (f) => f.formationNumber === expectedFormationNumber,
            ) ?? null;
        return {
            latestSighting,
            expectedSighting:
                formation && latestSighting.operation
                    ? { operation: latestSighting.operation, formation }
                    : null,
        };
    }

    async #buildResultWithOperation(
        latestSighting: OperationSightingDetailsDto,
        expectedOperationNumber: string,
        calendar: { id: string },
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const operations = await this.operationQuery.findManyByCalendarId({
            calendarId: calendar.id,
        });
        const operation =
            operations.find(
                (o) => o.operationNumber === expectedOperationNumber,
            ) ?? null;
        return {
            latestSighting,
            expectedSighting:
                operation && latestSighting.formation
                    ? { formation: latestSighting.formation, operation }
                    : null,
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

        const domain = OperationSightingDomainBuilder.buildByCreateDto({
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

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

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

        const domain = OperationSightingDomainBuilder.buildByDetailsDto(dto);

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

type CacheAction =
    | { type: 'none' }
    | {
          type: 'upsert';
          cacheId: string | undefined;
          formationNumber: string;
          operationNumber: string;
      }
    | {
          type: 'rollback';
          cacheId: string;
          formationNumber: string;
          operationNumber: string;
          operationSightingId: string;
      }
    | { type: 'delete'; domain: OperationSightingLatestCache };

function selectMostRecentCandidateForOperationNumber(
    caches: OperationSightingLatestCacheDto[],
    targetOperationNumber: string,
    searchBaseDate: dayjs.Dayjs,
): OperationSightingLatestCacheDto | null {
    const candidates = caches.filter((row) => {
        const daysAgo = searchBaseDate.diff(
            getBaseDate(dayjs(row.sightingTime)),
            'day',
        );
        return (
            buildCirculationPath(row.operationNumber, daysAgo)
                ?.expectedOperationNumber === targetOperationNumber
        );
    });
    if (candidates.length === 0) return null;
    return candidates.sort(
        (a, b) =>
            dayjs(b.sightingTime).valueOf() - dayjs(a.sightingTime).valueOf(),
    )[0];
}

function buildCirculationPath(
    startOperationNumber: string,
    steps: number,
): { path: string[]; expectedOperationNumber: string } | null {
    const path: string[] = [];
    let current = startOperationNumber;
    for (let i = 0; i < steps; i++) {
        const next = operationNumberCirculateMap.get(current);
        if (!next) return null;
        current = next;
        path.push(current);
    }
    return { path, expectedOperationNumber: current };
}

function getGroupMembers(
    start: string,
    map: Map<string, string>,
    maxSteps = 9,
): string[] {
    const members = new Set<string>([start]);
    let current = start;
    for (let i = 0; i < maxSteps; i++) {
        const next = map.get(current);
        if (!next || next === start) break;
        members.add(next);
        current = next;
    }
    return [...members];
}

const operationNumberCirculateMap = new Map([
    // 1群
    ['11', '12'],
    ['12', '13'],
    ['13', '14'],
    ['14', '15'],
    ['15', '16'],
    ['16', '11'],
    // 5群
    ['51', '52'],
    ['52', '53'],
    ['53', '54'],
    ['54', '55'],
    ['55', '56'],
    ['56', '57'],
    ['57', '58'],
    ['58', '59'],
    ['59', '51'],
    // 6群
    ['61', '62'],
    ['62', '63'],
    ['63', '64'],
    ['64', '65'],
    ['65', '66'],
    ['66', '67'],
    ['67', '68'],
    ['68', '69'],
    ['69', '61'],
    // 7群
    ['70', '71'],
    ['71', '72'],
    ['72', '73'],
    ['73', '70'],
    // 9G群
    ['91G', '92G'],
    ['92G', '93G'],
    ['93G', '94G'],
    ['94G', '95G'],
    ['95G', '91G'],
]);
const operationNumberCirculateReverseMap = new Map([
    ...Array.from(operationNumberCirculateMap.entries()).map(
        (arr) => arr.reverse() as [string, string],
    ),
]);
