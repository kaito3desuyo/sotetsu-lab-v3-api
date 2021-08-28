import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { VehicleDetailsDto } from '../../usecase/dtos/vehicle-details.dto';
import { VehicleModel } from '../models/vehicle.model';

export function buildVehicleDetailsDto(model: VehicleModel): VehicleDetailsDto {
    return plainToClass(VehicleDetailsDto, model, transformerOptions);
}
