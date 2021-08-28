import { Expose, Type } from 'class-transformer';
import { VehicleDetailsDto } from 'src/libs/vehicle/usecase/dtos/vehicle-details.dto';
import { BaseVehicleFormationModel } from './base-vehicle-formation.dto';
import { FormationDetailsDto } from './formation-details.dto';

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
    formation?: FormationDetailsDto;

    @Expose()
    @Type(() => VehicleDetailsDto)
    vehicle?: VehicleDetailsDto;
}
