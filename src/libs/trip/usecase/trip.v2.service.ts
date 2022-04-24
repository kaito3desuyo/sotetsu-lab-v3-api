import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TripQuery } from '../infrastructure/queries/trip.query';
import { TripDetailsDto } from './dtos/trip-details.dto';

@Injectable()
export class TripV2Service {
    constructor(private readonly tripQuery: TripQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<TripDetailsDto[] | GetManyDefaultResponse<TripDetailsDto>> {
        return this.tripQuery.findManyTrips(query);
    }
}
