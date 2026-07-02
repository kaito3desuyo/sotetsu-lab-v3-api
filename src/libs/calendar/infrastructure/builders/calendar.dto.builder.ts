import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export const CalendarDtoBuilder = {
    buildFromModel: (model: CalendarModel): CalendarDetailsDto => {
        return plainToClass(CalendarDetailsDto, model, transformerOptions);
    },
} as const;

export const CalendarsDtoBuilder = {
    buildFromModel: (models: CalendarModel[]): CalendarDetailsDto[] => {
        return models.map((model) => CalendarDtoBuilder.buildFromModel(model));
    },
} as const;
