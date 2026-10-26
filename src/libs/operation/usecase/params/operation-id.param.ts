import { IsUUID } from 'class-validator';

export class OperationIdParam {
    @IsUUID()
    id!: string;
}
