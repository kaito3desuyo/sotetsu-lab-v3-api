import { Injectable } from '@nestjs/common';
import { StationQuery } from '../infrastructure/queries/station.query';
import { StationDetailsDto } from './dtos/station-details.dto';

@Injectable()
export class StationV3Service {
    constructor(private readonly stationQuery: StationQuery) {}

    findAll(): Promise<StationDetailsDto[]> {
        return this.stationQuery.findAll();
    }
}
