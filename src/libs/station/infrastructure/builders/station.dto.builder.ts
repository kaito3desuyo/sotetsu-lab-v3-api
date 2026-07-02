import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';

export const StationDtoBuilder = {
    buildFromModel: (model: StationModel): StationDetailsDto => {
        return plainToClass(StationDetailsDto, model, transformerOptions);
    },
} as const;

export const StationsDtoBuilder = {
    buildFromModel: (models: StationModel[]): StationDetailsDto[] => {
        return models.map((model) => StationDtoBuilder.buildFromModel(model));
    },
} as const;
