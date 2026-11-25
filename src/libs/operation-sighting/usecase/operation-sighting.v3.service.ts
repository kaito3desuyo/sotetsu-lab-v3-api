import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { UnexpectedError } from '../../../core/classes/unexpected-error.js';
import { CalendarQuery } from '../../calendar/infrastructure/queries/calendar.query.js';
import { FormationQuery } from '../../formation/infrastructure/queries/formation.query.js';
import { ItinerarySegmentReader } from '../../operation/usecase/itinerary-segment.reader.js';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import { DataSource, EntityManager } from 'typeorm';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain.js';
import { parseSightingTime } from '../domain/sighting-time.js';
import { TransferStart } from '../domain/transfer-start.js';
import { lockFormationCache } from '../infrastructure/command/formation-cache-lock.js';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command.js';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command.js';
import { OperationSightingAuthorCommand } from '../infrastructure/command/operation-sighting-author.command.js';
import { UserAccessTraceService } from '../../user/usecase/user-access-trace.service.js';
import { pastSightingDateCacheTags } from '../../../core/modules/cdn-invalidation/cache-tags.js';
import { CdnInvalidation } from '../../../core/modules/cdn-invalidation/cdn-invalidation.js';
import { SocketSignal } from '../../../core/modules/socket-signal/socket-signal.js';
import { OperationSightingLatestCacheQuery } from '../infrastructure/queries/operation-sighting-latest-cache.query.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder.js';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto.js';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto.js';
import {
    CacheAction,
    decideCacheAction,
} from './operation-sighting.v3.circulation.js';

/**
 * まとめての無効化が新しい件を始めてよい経過時間（ミリ秒）。
 * Lambda のタイムアウトが 3 秒で、予算はループの開始から数えるので、
 * ループの前の認証・RBAC の分と、最後の 1 件と合図の分を 3 秒の内に残して打ち切り、残りは pending で返す。
 */
export const INVALIDATE_MANY_TIME_BUDGET_MS = 1000;

/** まとめての無効化が予期しない例外で止まったときに応答へ出す固定の文言 */
export const INVALIDATE_MANY_UNEXPECTED_MESSAGE =
    '予期しないエラーで止まりました';

/** まとめての無効化の結果。 */
export interface InvalidateManyResult {
    invalidated: string[];
    skipped: { id: string; reason: 'not_found' | 'already_invalidated' }[];
    failed: { id: string; message: string } | null;
    /** 予算切れ・失敗で手を付けなかった id（元の順） */
    pending: string[];
}

@Injectable()
export class OperationSightingV3Service {
    readonly #logger = new Logger(OperationSightingV3Service.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingLatestCacheCommand: OperationSightingLatestCacheCommand,
        private readonly operationSightingLatestCacheQuery: OperationSightingLatestCacheQuery,
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly calendarQuery: CalendarQuery,
        private readonly operationQuery: OperationQuery,
        private readonly itinerarySegmentReader: ItinerarySegmentReader,
        private readonly formationQuery: FormationQuery,
        private readonly operationSightingAuthorCommand: OperationSightingAuthorCommand,
        private readonly socketSignal: SocketSignal,
        private readonly accessTraces: UserAccessTraceService,
        private readonly cdnInvalidation: CdnInvalidation,
    ) {}

    async post(
        params: PostOperationSightingDto & {
            userId: string | null;
            viewer: { ip: string | null; userAgent: string | null };
        },
    ): Promise<OperationSightingDetailsDto> {
        const { agencyId, formationOrVehicleNumber } = params;
        const { sightingTimeInstance, sightingTimeInJst, date } =
            parseSightingTime(params);
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

        // 投稿者の手がかり（IP・端末）を書くのは、登録者で IP が分かるときだけ
        const traceTarget =
            params.userId && params.viewer.ip
                ? { userId: params.userId, ip: params.viewer.ip }
                : null;
        const saved = await this.dataSource.transaction(async (manager) => {
            // 同じ編成への書き込みを並べる。キャッシュは lock を取ってから読む
            await lockFormationCache(manager, formation.formationNumber);
            // 投稿の後のキャッシュ。lock を取った transaction の manager で読む
            const currentCache =
                await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                    { formationNumber: formation.formationNumber },
                    manager,
                );
            const cacheAction = decideCacheAction(currentCache, {
                formationNumber: formation.formationNumber,
                operationNumber: operation.operationNumber,
                sightingTime: sightingTimeInstance,
            });
            const saved = await this.operationSightingCommand.save(
                domain,
                manager,
            );
            // 匿名の利用者は記録しない（FK のせいで後から匿名の利用者を消せなくなる）
            if (params.userId) {
                await this.operationSightingAuthorCommand.create(
                    {
                        operationSightingId: saved.operationSightingId,
                        userId: params.userId,
                    },
                    manager,
                );
            }
            if (traceTarget) {
                await this.accessTraces.recordPost(
                    {
                        ...traceTarget,
                        operationSightingId: saved.operationSightingId,
                        userAgent: params.viewer.userAgent,
                    },
                    manager,
                );
            }
            await this.#applyCacheAction(
                cacheAction,
                saved.operationSightingId,
                manager,
            );
            return saved;
        });
        await Promise.all([
            this.#invalidatePastSightingDates([sightingTimeInstance.toDate()]),
            this.socketSignal.send({ type: 'sighting' }),
            // 古い手がかりの掃除は commit の後（失敗は purgeExpiredIfDue が握る）
            traceTarget
                ? this.accessTraces.purgeExpiredIfDue()
                : Promise.resolve(),
        ]);
        return saved;
    }

    async invalidate(params: {
        operationSightingId: string;
        userId: string;
        reason: string;
    }): Promise<OperationSightingDetailsDto> {
        const { saved, sightingTime } = await this.#invalidateOne(params);
        await this.#sendInvalidationSignals([sightingTime]);
        return saved;
    }

    /**
     * 目撃をまとめて無効にする。順に 1 件ずつ処理し、合図（socket・CDN）は最後に 1 回だけ送る
     * （200 件で CloudFront の失効を 200 回呼ばないため）。
     * 経過時間が予算を超えたら新しい件を始めず、予期しない例外が出たらそこで止めて、
     * 手を付けなかった id は pending に返す。
     */
    async invalidateMany(params: {
        ids: string[];
        userId: string;
        reason: string;
        /** 経過時間を測る時計（ミリ秒）。テストで差し替える */
        now?: () => number;
    }): Promise<InvalidateManyResult> {
        const { userId, reason, now = Date.now } = params;
        const ids = [...new Set(params.ids)];
        const startedAt = now();

        const result: InvalidateManyResult = {
            invalidated: [],
            skipped: [],
            failed: null,
            pending: [],
        };
        const sightingTimes: Date[] = [];

        for (const [index, id] of ids.entries()) {
            if (now() - startedAt >= INVALIDATE_MANY_TIME_BUDGET_MS) {
                result.pending = ids.slice(index);
                break;
            }
            try {
                const { sightingTime } = await this.#invalidateOne({
                    operationSightingId: id,
                    userId,
                    reason,
                });
                result.invalidated.push(id);
                sightingTimes.push(sightingTime);
            } catch (error) {
                const skipReason = skippableReason(error);
                if (skipReason) {
                    result.skipped.push({ id, reason: skipReason });
                    continue;
                }
                // 単体の無効化なら UnexpectedErrorFilter が記録するので、ここでも残す
                this.#logger.error(
                    `目撃情報のまとめての無効化が予期しないエラーで止まった（operationSightingId: ${id}）: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    error instanceof Error ? error.stack : undefined,
                );
                // 内部の文言（DB のエラー文など）は応答に出さない
                result.failed = {
                    id,
                    message:
                        error instanceof UseCaseError
                            ? error.message
                            : INVALIDATE_MANY_UNEXPECTED_MESSAGE,
                };
                result.pending = ids.slice(index + 1);
                break;
            }
        }

        if (sightingTimes.length > 0) {
            await this.#sendInvalidationSignals(sightingTimes);
        }
        return result;
    }

    /** 無効にして保存するところまで。合図は呼び出し側が送る */
    async #invalidateOne(params: {
        operationSightingId: string;
        userId: string;
        reason: string;
    }): Promise<{ saved: OperationSightingDetailsDto; sightingTime: Date }> {
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

        if (dto.invalidation) {
            throw new UseCaseError('目撃情報はすでに無効です', {
                operationSightingId,
                reason: 'already_invalidated',
            });
        }

        if (!dto.formation?.formationNumber) {
            throw new UnexpectedError('目撃情報に編成情報が存在しない', {
                operationSightingId,
            });
        }
        const formationNumber = dto.formation.formationNumber;

        const saved = await this.dataSource.transaction(async (manager) => {
            // 同じ編成への書き込みを並べる。lock を取ってから、状態を読み直して判断する
            await lockFormationCache(manager, formationNumber);
            const current = await this.operationSightingQuery.findOneById(
                { id: operationSightingId },
                manager,
            );
            if (!current) {
                throw new UseCaseError('目撃情報が見つかりません', {
                    operationSightingId,
                    reason: 'not_found',
                });
            }
            if (current.invalidation) {
                throw new UseCaseError('目撃情報はすでに無効です', {
                    operationSightingId,
                    reason: 'already_invalidated',
                });
            }
            const domain =
                OperationSightingDomainBuilder.buildFromDetailsDto(current);
            domain.invalidate(userId, reason);

            const cacheAction = await this.#decideCacheActionForInvalidation(
                {
                    operationSightingId,
                    formationNumber,
                    sightingTime: current.sightingTime,
                },
                manager,
            );
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
        return { saved, sightingTime: dto.sightingTime };
    }

    /** 無効化の後の合図。socket は 1 回、CDN は過ぎた運行日のタグをまとめて 1 回 */
    async #sendInvalidationSignals(
        sightingTimes: readonly Date[],
    ): Promise<void> {
        await Promise.all([
            this.#invalidatePastSightingDates(sightingTimes),
            this.socketSignal.send({ type: 'sighting' }),
        ]);
    }

    async restore(params: {
        operationSightingId: string;
        userId: string;
        reason: string;
    }): Promise<OperationSightingDetailsDto> {
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

        if (!dto.formation?.formationNumber) {
            throw new UnexpectedError('目撃情報に編成情報が存在しない', {
                operationSightingId,
            });
        }
        const formationNumber = dto.formation.formationNumber;

        const saved = await this.dataSource.transaction(async (manager) => {
            // 同じ編成への書き込みを並べる。lock を取ってから、状態を読み直して判断する
            await lockFormationCache(manager, formationNumber);
            const current = await this.operationSightingQuery.findOneById(
                { id: operationSightingId },
                manager,
            );
            if (!current) {
                throw new UseCaseError('目撃情報が見つかりません', {
                    operationSightingId,
                    reason: 'not_found',
                });
            }
            if (!current.invalidation) {
                throw new UseCaseError('目撃情報は有効です', {
                    operationSightingId,
                    reason: 'already_valid',
                });
            }
            if (!current.operation?.operationNumber) {
                throw new UnexpectedError('目撃情報に運用情報が存在しない', {
                    operationSightingId,
                });
            }
            const domain =
                OperationSightingDomainBuilder.buildFromDetailsDto(current);
            domain.restore(userId, reason);

            // 復元の後のキャッシュ。lock を取った transaction の manager で読む
            const currentCache =
                await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                    { formationNumber },
                    manager,
                );
            const cacheAction = decideCacheAction(currentCache, {
                formationNumber,
                operationNumber: current.operation.operationNumber,
                sightingTime: current.sightingTime,
            });
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
        await Promise.all([
            this.#invalidatePastSightingDates([dto.sightingTime]),
            this.socketSignal.send({ type: 'sighting' }),
        ]);
        return saved;
    }

    /**
     * 過ぎた運行日の目撃を書いたら、その日の過去の運用情報の CDN キャッシュを捨てる。
     * 今日の運行日の目撃は CDN に載せない画面なので、タグが空なら呼ばない。
     */
    async #invalidatePastSightingDates(
        sightingTimes: readonly Date[],
    ): Promise<void> {
        const tags = pastSightingDateCacheTags({
            sightingTimes,
            now: dayjs(),
        });
        if (tags.length === 0) {
            return;
        }
        await this.cdnInvalidation.invalidate({ tags });
    }

    /** 無効化の後のキャッシュ。lock を取った transaction の manager で読む */
    async #decideCacheActionForInvalidation(
        params: {
            operationSightingId: string;
            formationNumber: string;
            sightingTime: Date;
        },
        manager: EntityManager,
    ): Promise<CacheAction> {
        const { operationSightingId, formationNumber, sightingTime } = params;
        const currentCache =
            await this.operationSightingLatestCacheQuery.findOneByFormationNumber(
                { formationNumber },
                manager,
            );
        if (currentCache?.operationSightingId !== operationSightingId) {
            return { type: 'none' };
        }
        const prevSighting =
            await this.operationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime(
                {
                    formationNumber,
                    sightingTime: dayjs(sightingTime).subtract(1, 'ms'),
                },
                manager,
            );
        if (!prevSighting) {
            return {
                type: 'delete',
                domain: OperationSightingLatestCache.create(
                    {
                        operationSightingId: currentCache.operationSightingId,
                        operationNumber: currentCache.operationNumber,
                        formationNumber: currentCache.formationNumber,
                    },
                    new UniqueEntityId(currentCache.id),
                ),
            };
        }
        if (!prevSighting.operation?.operationNumber) {
            throw new UnexpectedError('直前目撃情報に運用情報が存在しない', {
                operationSightingId,
                prevSightingId: prevSighting.operationSightingId,
            });
        }
        return {
            type: 'rollback',
            cacheId: currentCache.id,
            formationNumber,
            operationNumber: prevSighting.operation.operationNumber,
            operationSightingId: prevSighting.operationSightingId,
        };
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

        // 乗り移りで始まる運用は、前の運用の列車が着くまで投稿できない。
        // 始発の 30 分前の判定も当てたまま、遅いほうの時刻から投稿できる（着いてから始発まで間が長い運用で、今より早く投稿できるようにはしない）
        const segments = await this.itinerarySegmentReader.findManyByCalendarId(
            {
                calendarId: calendar.id,
            },
        );
        const transferStart = TransferStart.find(segments, operation.id);
        if (transferStart) {
            const arrivalTime = dayjs
                .tz(date, 'Asia/Tokyo')
                .add(transferStart.arrivalSeconds, 'second');
            if (
                arrivalTime.isAfter(
                    firstDepartureTime.subtract(30, 'minute'),
                ) &&
                sightingTimeInJst.isBefore(arrivalTime)
            ) {
                throw new UseCaseError(
                    `前の運用（${transferStart.previousOperationNumber}）の列車が着く ${arrivalTime.format('HH:mm')} より前は、${operationNumber} で投稿できません`,
                    {
                        operationId: operation.id,
                        operationNumber,
                        sightingTime,
                        sightingTimeJst: sightingTimeInJst.format(),
                        date,
                        earliestPostTime:
                            arrivalTime.format('YYYY-MM-DD HH:mm'),
                        previousOperationNumber:
                            transferStart.previousOperationNumber,
                        reason: 'before_transfer_arrival',
                    },
                );
            }
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

/** まとめての無効化で止めずに飛ばしてよい失敗（なければ null） */
function skippableReason(
    error: unknown,
): 'not_found' | 'already_invalidated' | null {
    if (!(error instanceof UseCaseError)) {
        return null;
    }
    const reason = error.context.reason;
    return reason === 'not_found' || reason === 'already_invalidated'
        ? reason
        : null;
}
