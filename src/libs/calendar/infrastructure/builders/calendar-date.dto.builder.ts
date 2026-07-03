import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateModel } from '../models/calendar-date.model';

export const CalendarDateDtoBuilder = {
    buildFromModel: (model: CalendarDateModel): CalendarDateDetailsDto => {
        return plainToClass(CalendarDateDetailsDto, model, transformerOptions);
    },
} as const;

export const CalendarDatesDtoBuilder = {
    buildFromModel: (models: CalendarDateModel[]): CalendarDateDetailsDto[] => {
        return models.map((model) => CalendarDateDtoBuilder.buildFromModel(model));
    },
} as const;
