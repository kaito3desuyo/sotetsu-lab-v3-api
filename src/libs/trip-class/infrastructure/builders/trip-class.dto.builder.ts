import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { TripClassModel } from 'src/libs/trip-class/infrastructure/models/trip-class.model';
import { TripClassDetailsDto } from 'src/libs/trip-class/usecase/dtos/trip-class-details.dto';

export const TripClassDtoBuilder = {
    buildFromModel: (model: TripClassModel): TripClassDetailsDto => {
        return plainToClass(TripClassDetailsDto, model, transformerOptions);
    },
} as const;

export const TripClassesDtoBuilder = {
    buildFromModel: (models: TripClassModel[]): TripClassDetailsDto[] => {
        return models.map((model) => TripClassDtoBuilder.buildFromModel(model));
    },
} as const;
