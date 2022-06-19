import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from 'src/libs/trip/usecase/dtos/trip-details.dto';

export class TripBlockDetailsDto {
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
