import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto.js';
import { FormationModel } from '../models/formation.model.js';

export const FormationDtoBuilder = {
    buildFromModel: (model: FormationModel): FormationDetailsDto => {
        return plainToClass(
            FormationDetailsDto,
            {
                ...model,
                formationId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const FormationsDtoBuilder = {
    buildFromModel: (models: FormationModel[]): FormationDetailsDto[] => {
        return models.map((model) => FormationDtoBuilder.buildFromModel(model));
    },
} as const;
