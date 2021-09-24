import { Expose } from 'class-transformer';
import { BaseStopDto } from './base-stop.dto';

export class StopDetailsDto extends BaseStopDto {
    @Expose()
    id: string;

    @Expose()
    stationId: string;

    @Expose()
    stopName: string;

    @Expose()
    stopDescription: string;

    @Expose()
    stopLatlng: string;

    @Expose()
    zoneId: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
