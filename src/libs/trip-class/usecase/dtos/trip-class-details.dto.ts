import { Expose, Type } from 'class-transformer';
import { ServiceDetailsDto } from 'src/libs/service/usecase/dtos/service-details.dto';
import { TripDetailsDto } from 'src/libs/trip/usecase/dtos/trip-details.dto';
import { BaseTripClassDto } from './base-trip-class.dto';

export class TripClassDetailsDto extends BaseTripClassDto {
    @Expose()
    id: string;

    @Expose()
    serviceId: string;

    @Expose()
    tripClassName: string;

    @Expose()
    tripClassColor: string;

    @Expose()
    sequence: number;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: TripDetailsDto[];

    @Expose()
    @Type(() => ServiceDetailsDto)
    service?: ServiceDetailsDto;
}
