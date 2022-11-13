import { IsUUID } from 'class-validator';

export class ReplaceTripBlockParam {
    @IsUUID()
    id: string;
}
