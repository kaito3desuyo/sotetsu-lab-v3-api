import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export function buildOperationSightingDetailsDto(
    model: OperationSightingModel,
): OperationSightingDetailsDto {
    return plainToClass(
        OperationSightingDetailsDto,
        {
            ...model,
            operationSightingId: model.id,
        },
        transformerOptions,
    );
}

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
