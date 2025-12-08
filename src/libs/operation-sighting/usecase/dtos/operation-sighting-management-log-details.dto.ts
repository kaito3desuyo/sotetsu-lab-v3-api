import { Expose } from 'class-transformer';
import { BaseOperationSightingManagementLogDto } from './base-operation-sighting-management-log.dto';

export class OperationSightingManagementLogDetailsDto extends BaseOperationSightingManagementLogDto {
    @Expose({ name: 'id' })
    operationSightingManagementLogId: string;

    @Expose()
    operationSightingId: string;

    @Expose()
    userId: string;

    @Expose()
    action: string;

    @Expose()
    reason: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
