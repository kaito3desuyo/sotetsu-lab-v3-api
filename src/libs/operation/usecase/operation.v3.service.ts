import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
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
import { OPERATION_WITH_TRIPS_SELECTION_TREE } from './operation-with-trips-selection.js';

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

    findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        return this.operationQuery.findManyBySpecificPeriod({
            start,
            end,
        });
    }

    findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto | null> {
        const { operationId, searchTime } = params;

        const result = this.operationQuery.findOneWithCurrentPosition({
            operationId,
            searchTime,
        });

        return result;
    }

    /**
     * 複数の運用の現在位置をまとめて返す（リアルタイム運用情報用。運用ごとの
     * /:id/current-position を束ねる）。時刻は全件で同じ瞬間にそろえる。
     */
    findManyWithCurrentPosition(params: {
        operationIds: string[];
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto[]> {
        return this.operationQuery.findManyWithCurrentPosition({
            operationIds: params.operationIds,
            searchTime: params.searchTime ?? dayjs().toISOString(),
        });
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

    findOneWithTrips(params: {
        operationId: string;
    }): Promise<OperationWithTripsDto | null> {
        return this.operationQuery.findOneWithTrips(params);
    }

    async findManyItineraryLinks(params: {
        calendarId: string;
    }): Promise<OperationItineraryLinkDto[]> {
        return buildOperationItineraryLinks(
            VehicleItineraryReadModel.create(
                await this.itinerarySegmentQuery.findManyByCalendarId(params),
            ),
        );
    }

    async findManyNextSegmentCandidates(params: {
        calendarId: string;
        stationId: string;
        afterSeconds: number;
    }): Promise<NextSegmentCandidateDto[]> {
        const { calendarId, ...rest } = params;
        return buildNextSegmentCandidates(
            await this.itinerarySegmentQuery.findManyByCalendarId({
                calendarId,
            }),
            rest,
        );
    }
}
