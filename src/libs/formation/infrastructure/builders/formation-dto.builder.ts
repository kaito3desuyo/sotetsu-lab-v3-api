import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export function buildFormationDetailsDto(
    model: FormationModel,
): FormationDetailsDto {
    return plainToClass(FormationDetailsDto, model, transformerOptions);
}

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
};

export const FormationsDtoBuilder = {
    buildFromModel: (models: FormationModel[]): FormationDetailsDto[] => {
        return models.map((model) => FormationDtoBuilder.buildFromModel(model));
    },
};
