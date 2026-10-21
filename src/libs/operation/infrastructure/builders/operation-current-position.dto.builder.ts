import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { TripOperationListModel } from '../../../trip/infrastructure/models/trip-operation-list.model.js';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto.js';
import { OperationModel } from '../models/operation.model.js';

export const OperationCurrentPositionDtoBuilder = {
    buildFromModel: (model: {
        operation: OperationModel;
        prev: TripOperationListModel | null;
        current: TripOperationListModel | null;
        next: TripOperationListModel | null;
    }): OperationCurrentPositionDto => {
        return plainToClass(
            OperationCurrentPositionDto,
            model,
            transformerOptions,
        );
    },
} as const;
