import { IsUUID } from 'class-validator';

export class ServiceIdParam {
    @IsUUID()
    id!: string;
}
