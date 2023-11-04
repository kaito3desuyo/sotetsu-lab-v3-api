import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

export function buildServiceDetailsDto(model: ServiceModel): ServiceDetailsDto {
    return plainToClass(ServiceDetailsDto, model, transformerOptions);
}
