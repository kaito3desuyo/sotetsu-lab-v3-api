import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto.js';
import { OperationModel } from '../models/operation.model.js';

export const OperationDtoBuilder = {
    buildFromModel: (model: OperationModel): OperationDetailsDto => {
        return plainToClass(
            OperationDetailsDto,
            {
                ...model,
                operationId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationsDtoBuilder = {
    buildFromModel: (models: OperationModel[]): OperationDetailsDto[] => {
        return models.map((model) => OperationDtoBuilder.buildFromModel(model));
    },
} as const;
