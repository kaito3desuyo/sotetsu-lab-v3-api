import { Injectable } from '@nestjs/common';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationGroupDto } from './dtos/operation-group.dto';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto';
import { getOperationGroups } from './operation-number-circulation';

@Injectable()
export class OperationV3Service {
    constructor(private readonly operationQuery: OperationQuery) {}

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

    findOneWithTrips(params: {
        operationId: string;
    }): Promise<OperationWithTripsDto | null> {
        return this.operationQuery.findOneWithTrips(params);
    }
}
