import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { VehicleItineraryReadModel } from './read-models/vehicle-itinerary.read-model';
import { ItinerarySegmentQuery } from 'src/libs/operation/infrastructure/queries/itinerary-segment.query';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import {
    buildNextSegmentCandidates,
    buildOperationItineraryLinks,
} from './build-operation-itinerary-links';
import { NextSegmentCandidateDto } from './dtos/next-segment-candidate.dto';
import { OperationItineraryLinkDto } from './dtos/operation-itinerary-link.dto';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationGroupDto } from './dtos/operation-group.dto';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto';
import { getOperationGroups } from './operation-number-circulation';

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
    }): Promise<OperationCurrentPositionDto> {
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

    findManyWithTrips(params: {
        calendarId: string;
    }): Promise<OperationWithTripsDto[]> {
        return this.operationQuery.findManyWithTrips(params);
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
