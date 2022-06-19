import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable()
export class TripBlockV2Service {
    constructor(private readonly tripBlockQuery: TripBlockQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        TripBlockDetailsDto[] | GetManyDefaultResponse<TripBlockDetailsDto>
    > {
        return this.tripBlockQuery.findManyTripBlocks(query);
    }
}
