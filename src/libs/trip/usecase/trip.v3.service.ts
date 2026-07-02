import { Injectable } from '@nestjs/common';
import { TripQuery } from '../infrastructure/queries/trip.query';
import { TripDetailsDto } from './dtos/trip-details.dto';

@Injectable()
export class TripV3Service {
    constructor(private readonly tripQuery: TripQuery) {}

    findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
    }): Promise<TripDetailsDto[]> {
        return this.tripQuery.findManyByStationId(params);
    }
}
