import { IsUUID, ValidateIf } from 'class-validator';

export class AddTripToTripBlockDto {
    @ValidateIf((_, v) => v !== undefined)
    @IsUUID()
    id: string | undefined;

    @IsUUID()
    tripId: string;
}
