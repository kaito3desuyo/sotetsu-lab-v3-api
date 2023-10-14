import { IsUUID } from 'class-validator';

export class DeleteTripFromTripBlockParam {
    @IsUUID()
    id: string;
}
