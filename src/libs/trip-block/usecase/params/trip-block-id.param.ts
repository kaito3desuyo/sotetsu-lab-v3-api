import { IsUUID } from 'class-validator';

export class TripBlockIdParam {
    @IsUUID()
    id!: string;
}
