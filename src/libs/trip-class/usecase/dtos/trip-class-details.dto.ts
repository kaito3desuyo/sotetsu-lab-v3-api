import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { ServiceDetailsDto } from '../../../service/usecase/dtos/service-details.dto.js';
import { TripDetailsDto } from '../../../trip/usecase/dtos/trip-details.dto.js';
import { BaseTripClassDto } from './base-trip-class.dto.js';

export class TripClassDetailsDto extends BaseTripClassDto {
    @Expose()
    id!: string;

    @Expose()
    serviceId!: string;

    @Expose()
    tripClassName!: string;

    @Expose()
    tripClassColor!: string;

    @Expose()
    sequence!: number;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: Nested<TripDetailsDto[]>;

    @Expose()
    @Type(() => ServiceDetailsDto)
    service?: Nested<ServiceDetailsDto>;
}
