import { IsUUID } from 'class-validator';

export class TripStationIdParam {
    @IsUUID()
    stationId!: string;
}
