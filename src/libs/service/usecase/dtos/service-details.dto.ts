import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { BaseServiceDto } from './base-service.dto.js';
import { OperatingSystemDetailsDto } from './operating-system-details.dto.js';

export class ServiceDetailsDto extends BaseServiceDto {
    @Expose()
    id!: string;

    @Expose()
    serviceName!: string;

    @Expose()
    serviceDescription!: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => OperatingSystemDetailsDto)
    operatingSystems?: Nested<OperatingSystemDetailsDto[]>;
}
