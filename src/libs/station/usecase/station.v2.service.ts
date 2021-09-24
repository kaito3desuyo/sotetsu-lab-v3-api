import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { StationQuery } from '../infrastructure/queries/station.query';
import { StationDetailsDto } from './dtos/station-details.dto';

@Injectable()
export class StationV2Service {
    constructor(private readonly stationQuery: StationQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        StationDetailsDto[] | GetManyDefaultResponse<StationDetailsDto>
    > {
        return this.stationQuery.findManyStations(query);
    }

    findOne(query: CrudRequest): Promise<StationDetailsDto> {
        return this.stationQuery.findOneStation(query);
    }
}
