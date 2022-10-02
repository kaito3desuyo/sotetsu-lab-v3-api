import { IsUUID } from 'class-validator';

export class AddTripToTripBlockParam {
    @IsUUID()
    tripBlockId: string;

    @IsUUID()
    tripId: string;
}
