import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { VehicleFormationDetailsDto } from '../../usecase/dtos/vehicle-formation-details.dto';
import { VehicleFormationModel } from '../models/vehicle-formation.model';

export function buildVehicleFormationDetailsDto(
    model: VehicleFormationModel,
): VehicleFormationDetailsDto {
    return plainToClass(VehicleFormationDetailsDto, model, transformerOptions);
}
