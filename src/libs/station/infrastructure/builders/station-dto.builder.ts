import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';

export function buildStationDetailsDto(model: StationModel): StationDetailsDto {
    return plainToClass(StationDetailsDto, model, transformerOptions);
}
