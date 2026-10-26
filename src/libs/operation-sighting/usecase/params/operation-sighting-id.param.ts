import { IsUUID } from 'class-validator';

export class OperationSightingIdParam {
    @IsUUID()
    id!: string;
}
