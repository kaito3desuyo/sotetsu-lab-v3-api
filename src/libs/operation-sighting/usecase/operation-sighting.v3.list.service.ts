import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { UnexpectedError } from '../../../core/classes/unexpected-error.js';
import { getBaseDate } from '../../../core/utils/datetime.js';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { CalendarQuery } from '../../calendar/infrastructure/queries/calendar.query.js';
import { VehicleItineraryReadModel } from '../../operation/usecase/read-models/vehicle-itinerary.read-model.js';
import { ItinerarySegmentReader } from '../../operation/usecase/itinerary-segment.reader.js';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import {
    OperationSightingAuthorQuery,
    type OperationSightingSummaryRow,
} from '../infrastructure/queries/operation-sighting-author.query.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { MyOperationSightingDto } from './dtos/my-operation-sighting.dto.js';
import { OperationSightingAuthorDto } from './dtos/operation-sighting-author.dto.js';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto.js';
import { OperationSightingRecentDto } from './dtos/operation-sighting-recent.dto.js';
import { OperationSightingSummaryDto } from './dtos/operation-sighting-summary.dto.js';
import { SIGHTING_LIST_DEFAULT_LIMIT } from '../operation-sighting.constants.js';
import { OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE } from './operation-sightings-by-period-selection.js';
import { SightingCarryOver } from './read-models/sighting-carry-over.read-model.js';
import { SightingAuthorMarks } from './read-models/sighting-author-marks.read-model.js';
import {
    SightingCorroboration,
    type SightingCorroborationCounts,
} from './read-models/sighting-corroboration.read-model.js';

@Injectable()
export class OperationSightingV3ListService {
    constructor(
        private readonly operationSightingQuery: OperationSightingQuery,
        private readonly operationSightingAuthorQuery: OperationSightingAuthorQuery,
        private readonly calendarQuery: CalendarQuery,
        private readonly operationQuery: OperationQuery,
        private readonly itinerarySegmentReader: ItinerarySegmentReader,
    ) {}

    /** 投稿者（利用者）ごとの目撃を created_at の新しい順に。無効化したものも含む */
    async findManyByUserId(params: {
        userId: string;
        limit?: number;
        before?: string;
    }): Promise<OperationSightingSummaryDto[]> {
        const rows = await this.operationSightingAuthorQuery.findManyByUserId({
            userId: params.userId,
            limit: params.limit ?? SIGHTING_LIST_DEFAULT_LIMIT,
            before: params.before ? new Date(params.before) : null,
        });

        return rows.map(toSummaryDto);
    }

    /**
     * 本人の目撃を findManyByUserId と同じ一覧（同じ limit・before）で返し、各行に裏付けの判定を付ける。
     * 判定の材料は一覧の id でまとめて 1 回だけ引く（N+1 にしない）。
     */
    async findManyMine(params: {
        userId: string;
        limit?: number;
        before?: string;
    }): Promise<MyOperationSightingDto[]> {
        const sightings = await this.findManyByUserId(params);
        if (sightings.length === 0) {
            return [];
        }

        const facts =
            await this.operationSightingAuthorQuery.findCorroborationFacts({
                userId: params.userId,
                operationSightingIds: sightings.map(
                    (s) => s.operationSightingId,
                ),
            });
        const factsById = new Map(facts.map((f) => [f.operationSightingId, f]));

        return sightings.map((sighting) => {
            const fact = factsById.get(sighting.operationSightingId);
            if (!fact) {
                throw new UnexpectedError(
                    '本人の目撃情報の裏付けの材料が見つからない',
                    { operationSightingId: sighting.operationSightingId },
                );
            }
            return {
                ...sighting,
                corroboration: SightingCorroboration.of(fact),
            };
        });
    }

    /** 本人の全投稿（無効なものを含む）を、裏付けの判定ごとに数える */
    async countCorroborationsByUserId(params: {
        userId: string;
    }): Promise<SightingCorroborationCounts> {
        const facts =
            await this.operationSightingAuthorQuery.findCorroborationFacts({
                userId: params.userId,
                operationSightingIds: null,
            });

        return SightingCorroboration.count(facts.map(SightingCorroboration.of));
    }

    async findAuthor(params: {
        operationSightingId: string;
    }): Promise<OperationSightingAuthorDto> {
        const userId =
            await this.operationSightingAuthorQuery.findAuthorUserId(params);

        return { userId };
    }

    /** 新着の目撃を投稿者つきで created_at の新しい順に（ゲストの目撃も含む。newAccount・burst の印つき） */
    async findManyRecent(params: {
        limit?: number;
        before?: string;
    }): Promise<OperationSightingRecentDto[]> {
        const rows = await this.operationSightingAuthorQuery.findManyRecent({
            limit: params.limit ?? SIGHTING_LIST_DEFAULT_LIMIT,
            before: params.before ? new Date(params.before) : null,
            burstWindowMinutes: SightingAuthorMarks.BURST_WINDOW_MINUTES,
        });

        return rows.map((row) => ({
            ...toSummaryDto(row),
            author: row.author
                ? {
                      userId: row.author.userId,
                      username: row.author.username,
                      displayName: row.author.displayName,
                      role: row.author.role,
                      ...SightingAuthorMarks.of({
                          role: row.author.role,
                          registeredAt: row.author.registeredAt,
                          sightingCreatedAt: row.createdAt,
                          recentPostCount: row.author.recentPostCount,
                      }),
                  }
                : null,
        }));
    }

    /** `include`・`fields` があれば、作った一覧を選んだ関連・列だけに削る（docs/adr/0010-v3-include-and-fields.md） */
    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
        includeCarriedOver?: boolean;
        formationNumber?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationSightingDetailsDto[] | Record<string, unknown>[]> {
        const { include, fields, ...rest } = params;
        const tree = OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const sightings = await this.#findManyBySpecificPeriodFull(rest);
        if (!selection) {
            return sightings;
        }
        return sightings.map((o) => serializeSelection(o, tree, selection));
    }

    async #findManyBySpecificPeriodFull(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
        includeCarriedOver?: boolean;
        formationNumber?: string;
    }): Promise<OperationSightingDetailsDto[]> {
        const {
            start,
            end,
            includeInvalidated = false,
            includeCarriedOver = false,
            formationNumber,
        } = params;

        const direct =
            await this.operationSightingQuery.findManyBySpecificPeriod({
                start,
                end,
                includeInvalidated,
                formationNumber,
            });
        if (!includeCarriedOver) return direct;

        // 引き継ぎの材料は、直接の一覧と同じ範囲の目撃（operation・formation 付き）を別に引く。
        // 無効化も表示するときは、無効化された目撃も含めて流れを組む（ユーザー判断 2026-10-19）
        const format = 'YYYY-MM-DD';
        const material =
            await this.operationSightingQuery.findManyBySightingTimeRange({
                start: dayjs(start, format)
                    .hour(4)
                    .minute(0)
                    .second(0)
                    .millisecond(0),
                end: dayjs(end, format)
                    .add(1, 'day')
                    .hour(4)
                    .minute(0)
                    .second(0)
                    .millisecond(0),
                includeInvalidated,
            });
        const byDay = new Map<string, OperationSightingDetailsDto[]>();
        for (const o of material) {
            const day = getBaseDate(dayjs(o.sightingTime)).format(format);
            byDay.set(day, [...(byDay.get(day) ?? []), o]);
        }

        const itineraryCache = new Map<
            string,
            Promise<VehicleItineraryReadModel>
        >();
        const operationCache = new Map<
            string,
            ReturnType<OperationQuery['findManyByCalendarId']>
        >();
        const carried: OperationSightingDetailsDto[] = [];
        // 鉄道日 → その日の引き継ぎと運用（並べる位置を出すのに使う）
        const dayContext = new Map<
            string,
            {
                carry: SightingCarryOver;
                operations: Awaited<
                    ReturnType<OperationQuery['findManyByCalendarId']>
                >;
            }
        >();
        for (const [day, sightings] of byDay) {
            const calendar = await this.calendarQuery.findOneBySpecificDate({
                date: day,
            });
            if (!calendar) continue;
            if (!itineraryCache.has(calendar.id)) {
                itineraryCache.set(
                    calendar.id,
                    this.itinerarySegmentReader
                        .findManyByCalendarId({ calendarId: calendar.id })
                        .then((segments) =>
                            VehicleItineraryReadModel.create(segments),
                        ),
                );
            }
            if (!operationCache.has(calendar.id)) {
                operationCache.set(
                    calendar.id,
                    this.operationQuery.findManyByCalendarId({
                        calendarId: calendar.id,
                    }),
                );
            }
            const carry = SightingCarryOver.create(
                await itineraryCache.get(calendar.id)!,
            );
            const operations = await operationCache.get(calendar.id)!;
            dayContext.set(day, { carry, operations });
            carried.push(...carry.buildCarried({ sightings, operations }));
        }

        // 同じ行程の中は受け持つ順（18K → 17K → 18K）、行程をまたぐときは目撃の順に並べる。
        // キーは [鉄道日の始まり + その編成がその行程で最初に目撃された秒, 枠の始まりの秒]
        const orderOf = (o: OperationSightingDetailsDto): [number, number] => {
            const base = getBaseDate(dayjs(o.sightingTime));
            const day = base.format(format);
            const context = dayContext.get(day);
            const operationNumber = context?.operations.find(
                (p) => p.operationId === o.operationId,
            )?.operationNumber;
            if (!context || !operationNumber) {
                const time = dayjs(o.sightingTime).valueOf();
                return [time, time];
            }
            const [entered, start] = context.carry.orderOf(
                o,
                operationNumber,
                byDay.get(day) ?? [],
            );
            return [base.add(entered, 'second').valueOf(), start];
        };
        // 直接の目撃は query で絞り済み。材料は全編成から組むので、写しはここで編成番号で絞る
        const carriedOfFormation =
            formationNumber === undefined
                ? carried
                : carried.filter(
                      (o) => o.formation?.formationNumber === formationNumber,
                  );
        return [...direct, ...carriedOfFormation]
            .map((o) => ({ o, order: orderOf(o) }))
            .sort(
                (a, b) =>
                    a.order[0] - b.order[0] ||
                    a.order[1] - b.order[1] ||
                    dayjs(a.o.sightingTime).valueOf() -
                        dayjs(b.o.sightingTime).valueOf(),
            )
            .map(({ o }) => o);
    }
}

function toSummaryDto(
    row: OperationSightingSummaryRow,
): OperationSightingSummaryDto {
    return {
        operationSightingId: row.operationSightingId,
        sightingTime: row.sightingTime.toISOString(),
        createdAt: row.createdAt.toISOString(),
        operationNumber: row.operationNumber,
        formationNumber: row.formationNumber,
        invalidated: row.invalidated,
        invalidatedBy: row.invalidatedByUserId
            ? {
                  userId: row.invalidatedByUserId,
                  username: row.invalidatedByUsername ?? '',
              }
            : null,
    };
}
