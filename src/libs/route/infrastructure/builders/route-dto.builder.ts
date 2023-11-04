import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';

export function buildRouteDetailsDto(model: RouteModel): RouteDetailsDto {
    return plainToClass(RouteDetailsDto, model, transformerOptions);
}
