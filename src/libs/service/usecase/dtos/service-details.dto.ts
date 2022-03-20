import { Expose, Type } from 'class-transformer';
import { BaseServiceDto } from './base-service.dto';
import { OperatingSystemDetailsDto } from './operating-system-details.dto';

export class ServiceDetailsDto extends BaseServiceDto {
    @Expose()
    id: string;

    @Expose()
    serviceName: string;

    @Expose()
    serviceDescription: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => OperatingSystemDetailsDto)
    operatingSystems?: OperatingSystemDetailsDto[];
}
