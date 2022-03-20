import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
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
