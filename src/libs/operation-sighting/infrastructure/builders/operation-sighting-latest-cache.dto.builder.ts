import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { OperationSightingLatestCacheDto } from '../../usecase/dtos/operation-sighting-latest-cache.dto.js';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model.js';

export const OperationSightingLatestCacheDtoBuilder = {
    buildFromModel: (
        model: OperationSightingLatestCacheModel,
    ): OperationSightingLatestCacheDto => {
        return plainToClass(
            OperationSightingLatestCacheDto,
            {
                ...model,
                sightingTime: model.operationSighting?.sightingTime,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationSightingLatestCachesDtoBuilder = {
    buildFromModel: (
        models: OperationSightingLatestCacheModel[],
    ): OperationSightingLatestCacheDto[] => {
        return models.map((model) =>
            OperationSightingLatestCacheDtoBuilder.buildFromModel(model),
        );
    },
} as const;
