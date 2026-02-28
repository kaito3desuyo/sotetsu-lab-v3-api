import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from 'src/libs/agency/usecase/dtos/agency-details.dto';
import { BaseFormationDto } from './base-formation.dto';
import { VehicleFormationDetailsDto } from './vehicle-formation-details.dto';

export class FormationDetailsDto extends BaseFormationDto {
    @Expose()
    id: string;

    @Expose()
    formationId: string;

    @Expose()
    agencyId: string;

    @Expose()
    vehicleType: string;

    @Expose()
    formationNumber: string;

    @Expose()
    formationDescription: string;

    @Expose()
    startDate: string;

    @Expose()
    endDate: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agency?: AgencyDetailsDto;

    @Expose()
    @Type(() => VehicleFormationDetailsDto)
    vehicleFormations?: VehicleFormationDetailsDto[];
}
