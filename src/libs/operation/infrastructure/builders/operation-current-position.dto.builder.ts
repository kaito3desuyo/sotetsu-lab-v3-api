import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationModel } from '../models/operation.model';

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
