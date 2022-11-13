import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from 'src/libs/trip/usecase/dtos/trip-details.dto';
import { BaseTripBlockDto } from './base-trip-block.dto';

export class TripBlockDetailsDto extends BaseTripBlockDto {
    @Expose()
    id: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: TripDetailsDto[];
}
