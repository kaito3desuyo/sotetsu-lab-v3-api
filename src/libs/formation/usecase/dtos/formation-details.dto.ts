import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from '../../../agency/usecase/dtos/agency-details.dto.js';
import { BaseFormationDto } from './base-formation.dto.js';
import { VehicleFormationDetailsDto } from './vehicle-formation-details.dto.js';

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
    agency?: Nested<AgencyDetailsDto>;

    @Expose()
    @Type(() => VehicleFormationDetailsDto)
    vehicleFormations?: Nested<VehicleFormationDetailsDto[]>;
}
