import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationSightingLatestCacheDto } from '../../usecase/dtos/operation-sighting-latest-cache.dto';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

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
