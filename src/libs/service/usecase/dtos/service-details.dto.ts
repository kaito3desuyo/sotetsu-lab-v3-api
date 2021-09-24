import { Expose } from 'class-transformer';
import { BaseServiceDto } from './base-service.dto';

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
}
