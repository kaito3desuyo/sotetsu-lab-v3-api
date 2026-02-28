import { Injectable } from '@nestjs/common';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto';

@Injectable()
export class TripClassV3Service {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    findMany(): Promise<TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany();
    }
}
