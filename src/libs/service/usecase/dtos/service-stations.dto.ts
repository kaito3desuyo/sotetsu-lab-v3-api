import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from '../../../station/usecase/dtos/station-details.dto.js';
import { ServiceDetailsDto } from './service-details.dto.js';

export class ServiceStationsDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service!: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => StationDetailsDto)
    stations!: Nested<StationDetailsDto[]>;
}
