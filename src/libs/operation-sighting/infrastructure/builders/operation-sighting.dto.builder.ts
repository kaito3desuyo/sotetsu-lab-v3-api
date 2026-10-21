import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';

export const OperationSightingDtoBuilder = {
    buildFromModel: (
        model: OperationSightingModel,
    ): OperationSightingDetailsDto => {
        return plainToClass(
            OperationSightingDetailsDto,
            {
                ...model,
                operationSightingId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationSightingsDtoBuilder = {
    buildFromModel: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] => {
        return models.map((model) =>
            OperationSightingDtoBuilder.buildFromModel(model),
        );
    },
} as const;
