import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
    parseFieldsOnly,
    parseSelection,
} from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { VehicleItineraryReadModel } from './read-models/vehicle-itinerary.read-model.js';
import { ItinerarySegmentQuery } from '../infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from '../infrastructure/queries/operation.query.js';
import {
    buildNextSegmentCandidates,
    buildOperationItineraryLinks,
} from './build-operation-itinerary-links.js';
import { NextSegmentCandidateDto } from './dtos/next-segment-candidate.dto.js';
import { OperationItineraryLinkDto } from './dtos/operation-itinerary-link.dto.js';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto.js';
import { OperationDetailsDto } from './dtos/operation-details.dto.js';
import { OperationGroupDto } from './dtos/operation-group.dto.js';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto.js';
import { getOperationGroups } from './operation-number-circulation.js';
import {
    NEXT_SEGMENT_CANDIDATE_SELECTION_TREE,
    OPERATION_CURRENT_POSITION_SELECTION_TREE,
    OPERATION_ITINERARY_LINK_SELECTION_TREE,
} from './operation-read-model-selection.js';
import { OPERATION_WITH_TRIPS_SELECTION_TREE } from './operation-with-trips-selection.js';
import { OPERATIONS_BY_PERIOD_SELECTION_TREE } from './operations-by-period-selection.js';

@Injectable()
export class OperationV3Service {
    constructor(
        private readonly operationQuery: OperationQuery,
        private readonly itinerarySegmentQuery: ItinerarySegmentQuery,
    ) {}

    findAllGroups(): OperationGroupDto[] {
        return getOperationGroups();
    }

    findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<OperationDetailsDto[]> {
        const { calendarId } = params;

        return this.operationQuery.findManyByCalendarId({
            calendarId,
        });
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationDetailsDto[] | Record<string, unknown>[]> {
        const { start, end, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATIONS_BY_PERIOD_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findManyBySpecificPeriod({
                start,
                end,
            });
        }
        return this.operationQuery.findManyBySpecificPeriodWithSelection(
            { start, end },
            selection,
        );
    }

    /** `fields` があれば選んだ項目だけを返す（read-model なので include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationCurrentPositionDto | Record<string, unknown> | null> {
        const { operationId, searchTime, include, fields } = params;
        const tree = OPERATION_CURRENT_POSITION_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);

        const result = await this.operationQuery.findOneWithCurrentPosition({
            operationId,
            searchTime,
        });

        if (!selection || !result) {
            return result;
        }
        return serializeSelection(result, tree, selection);
    }

    /**
     * 複数の運用の現在位置をまとめて返す（リアルタイム運用情報用。運用ごとの
     * /:id/current-position を束ねる）。時刻は全件で同じ瞬間にそろえる。
     * `fields` があれば選んだ項目だけを返す（include は受けない）。
     */
    async findManyWithCurrentPosition(params: {
        operationIds: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationCurrentPositionDto[] | Record<string, unknown>[]> {
        const tree = OPERATION_CURRENT_POSITION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);

        const result = await this.operationQuery.findManyWithCurrentPosition({
            operationIds: params.operationIds,
            searchTime: params.searchTime ?? dayjs().toISOString(),
        });

        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyWithTrips(params: {
        calendarId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationWithTripsDto[] | Record<string, unknown>[]> {
        const { calendarId, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findManyWithTrips({ calendarId });
        }
        return this.operationQuery.findManyWithTripsWithSelection(
            { calendarId },
            selection,
        );
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithTrips(params: {
        operationId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationWithTripsDto | Record<string, unknown> | null> {
        const { operationId, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findOneWithTrips({ operationId });
        }
        return this.operationQuery.findOneWithTripsWithSelection(
            { operationId },
            selection,
        );
    }

    /** `fields` があれば選んだ項目だけを返す（read-model なので include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    async findManyItineraryLinks(params: {
        calendarId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationItineraryLinkDto[] | Record<string, unknown>[]> {
        const { calendarId, include, fields } = params;
        const tree = OPERATION_ITINERARY_LINK_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);

        const result = buildOperationItineraryLinks(
            VehicleItineraryReadModel.create(
                await this.itinerarySegmentQuery.findManyByCalendarId({
                    calendarId,
                }),
            ),
        );

        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }

    /**
     * 駅が無ければ空（fields の検めを先にする）。
     * `fields` があれば選んだ項目だけを返す（include は受けない）。
     */
    async findManyNextSegmentCandidates(params: {
        calendarId: string;
        stationId?: string;
        afterSeconds: number;
        include?: unknown;
        fields?: unknown;
    }): Promise<NextSegmentCandidateDto[] | Record<string, unknown>[]> {
        const { calendarId, stationId, afterSeconds, include, fields } = params;
        const tree = NEXT_SEGMENT_CANDIDATE_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);

        if (!stationId) return [];

        const result = buildNextSegmentCandidates(
            await this.itinerarySegmentQuery.findManyByCalendarId({
                calendarId,
            }),
            { stationId, afterSeconds },
        );

        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }
}
