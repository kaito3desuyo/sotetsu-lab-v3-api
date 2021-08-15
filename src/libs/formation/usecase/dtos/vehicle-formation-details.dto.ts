import { Expose, Type } from 'class-transformer';
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
}
