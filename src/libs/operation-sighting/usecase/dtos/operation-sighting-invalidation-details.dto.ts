import { Expose } from 'class-transformer';
import { BaseOperationSightingInvalidationDto } from './base-operation-sighting-invalidation.dto';

export class OperationSightingInvalidationDetailsDto extends BaseOperationSightingInvalidationDto {
    @Expose({ name: 'id' })
    operationSightingInvalidationId: string;

    @Expose()
    operationSightingId: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
