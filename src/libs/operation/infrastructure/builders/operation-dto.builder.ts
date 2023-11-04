import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export function buildOperationDetailsDto(
    model: OperationModel,
): OperationDetailsDto {
    return plainToClass(OperationDetailsDto, model, transformerOptions);
}
