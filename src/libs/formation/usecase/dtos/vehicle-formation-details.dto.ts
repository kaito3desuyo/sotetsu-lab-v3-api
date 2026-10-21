import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { VehicleDetailsDto } from '../../../vehicle/usecase/dtos/vehicle-details.dto.js';
import { BaseVehicleFormationModel } from './base-vehicle-formation.dto.js';
import { FormationDetailsDto } from './formation-details.dto.js';

export class VehicleFormationDetailsDto extends BaseVehicleFormationModel {
    @Expose()
    id: string;

    @Expose()
    formationId: string;

    @Expose()
    vehicleId: string;

    @Expose()
    carNumber: number;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => FormationDetailsDto)
    formation?: Nested<FormationDetailsDto>;

    @Expose()
    @Type(() => VehicleDetailsDto)
    vehicle?: Nested<VehicleDetailsDto>;
}
