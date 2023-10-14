import { IsUUID, ValidateIf } from 'class-validator';

export class DeleteTripFromTripBlockDto {
    @ValidateIf((_, v) => v !== undefined)
    @IsUUID()
    id: string | undefined;

    @IsUUID()
    tripId: string;
}
