import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

export function buildAgencyDetailsDto(model: AgencyModel): AgencyDetailsDto {
    return plainToClass(AgencyDetailsDto, model, transformerOptions);
}
