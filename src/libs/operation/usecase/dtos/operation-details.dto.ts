import { Expose } from 'class-transformer';
import { BaseOperationDto } from './base-operation.dto';

export class OperationDetailsDto extends BaseOperationDto {
    @Expose()
    id: string;

    @Expose()
    calendarId: string;

    @Expose()
    operationNumber: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
