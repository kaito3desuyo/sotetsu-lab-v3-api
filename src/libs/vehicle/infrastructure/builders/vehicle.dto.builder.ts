import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { VehicleDetailsDto } from '../../usecase/dtos/vehicle-details.dto';
import { VehicleModel } from '../models/vehicle.model';

export const VehicleDtoBuilder = {
    buildFromModel: (model: VehicleModel): VehicleDetailsDto => {
        return plainToClass(VehicleDetailsDto, model, transformerOptions);
    },
} as const;

export const VehiclesDtoBuilder = {
    buildFromModel: (models: VehicleModel[]): VehicleDetailsDto[] => {
        return models.map((model) => VehicleDtoBuilder.buildFromModel(model));
    },
} as const;
