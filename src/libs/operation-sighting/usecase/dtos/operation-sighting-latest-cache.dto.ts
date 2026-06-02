import { Expose } from 'class-transformer';

export class OperationSightingLatestCacheDto {
    @Expose()
    id: string;

    @Expose()
    operationSightingId: string;

    @Expose()
    operationNumber: string;

    @Expose()
    formationNumber: string;

    @Expose()
    sightingTime: Date;
}
