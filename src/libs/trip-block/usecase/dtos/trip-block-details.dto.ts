import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from '../../../trip/usecase/dtos/trip-details.dto.js';
import { BaseTripBlockDto } from './base-trip-block.dto.js';

export class TripBlockDetailsDto extends BaseTripBlockDto {
    @Expose()
    id: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trips?: Nested<TripDetailsDto[]>;
}
