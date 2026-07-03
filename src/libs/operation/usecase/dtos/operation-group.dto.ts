import { Expose } from 'class-transformer';

export class OperationGroupDto {
    @Expose()
    groupName: string;

    @Expose()
    operationNumbers: string[];
}
