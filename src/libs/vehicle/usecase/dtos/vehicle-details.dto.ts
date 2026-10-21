import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { VehicleFormationDetailsDto } from '../../../formation/usecase/dtos/vehicle-formation-details.dto.js';
import { BaseVehicleDto } from './base-vehicle.dto.js';

export class VehicleDetailsDto extends BaseVehicleDto {
    @Expose()
    id: string;

    @Expose()
    vehicleNumber: string;

    @Expose()
    belongs: string;

    @Expose()
    productionDate: string;

    @Expose()
    scrappedDate: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => VehicleFormationDetailsDto)
    vehicleFormations?: Nested<VehicleFormationDetailsDto[]>;
}
