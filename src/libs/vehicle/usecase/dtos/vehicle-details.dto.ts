import { Expose, Type } from 'class-transformer';
import { VehicleFormationDetailsDto } from 'src/libs/formation/usecase/dtos/vehicle-formation-details.dto';
import { BaseVehicleDto } from './base-vehicle.dto';

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
    vehicleFormations?: VehicleFormationDetailsDto[];
}
