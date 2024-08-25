import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { Injectable } from '@nestjs/common';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto';

@Injectable()
export class TripClassV2Service {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        TripClassDetailsDto[] | GetManyDefaultResponse<TripClassDetailsDto>
    > {
        return this.tripClassQuery.findManyTripClasses(query);
    }
}
