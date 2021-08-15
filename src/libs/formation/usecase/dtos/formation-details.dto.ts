import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from 'src/libs/agency/usecase/dtos/agency-details.dto';
import { BaseFormationDto } from './base-formation.dto';

export class FormationDetailsDto extends BaseFormationDto {
    @Expose()
    id: string;

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
}
