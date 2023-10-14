import { IsUUID } from 'class-validator';

export class AddTripToTripBlockParam {
    @IsUUID()
    id: string;
}
