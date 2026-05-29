import { IsISO8601, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PostOperationSightingDto {
    @IsUUID()
    agencyId: string;

    @IsString()
    @IsNotEmpty()
    formationOrVehicleNumber: string;

    @IsString()
    @IsNotEmpty()
    operationNumber: string;

    @IsISO8601()
    @IsNotEmpty()
    sightingTime: string;
}
