import { IsUUID } from 'class-validator';

export class DeleteTripFromTripBlockParam {
    @IsUUID()
    tripBlockId: string;

    @IsUUID()
    tripId: string;
}
