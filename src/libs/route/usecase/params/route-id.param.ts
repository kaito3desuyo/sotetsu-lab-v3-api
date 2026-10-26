import { IsUUID } from 'class-validator';

export class RouteIdParam {
    @IsUUID()
    id!: string;
}
