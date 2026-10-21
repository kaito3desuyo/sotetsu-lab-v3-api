import { Injectable } from '@nestjs/common';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query.js';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto.js';

@Injectable()
export class TripClassV3Service {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    findMany(params?: { serviceId?: string }): Promise<TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany(params);
    }
}
