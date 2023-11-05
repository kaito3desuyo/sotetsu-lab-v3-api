import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export function buildOperationDetailsDto(
    model: OperationModel,
): OperationDetailsDto {
    return plainToClass(OperationDetailsDto, model, transformerOptions);
}

export const OperationDtoBuilder = {
    buildFromModel: (model: OperationModel): OperationDetailsDto => {
        return plainToClass(OperationDetailsDto, model, transformerOptions);
    },
} as const;

export const OperationsDtoBuilder = {
    buildFromModel: (models: OperationModel[]): OperationDetailsDto[] => {
        return models.map((model) => OperationDtoBuilder.buildFromModel(model));
    },
};
