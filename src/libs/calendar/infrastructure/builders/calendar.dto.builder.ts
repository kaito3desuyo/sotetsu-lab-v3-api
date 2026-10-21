import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto.js';
import { CalendarModel } from '../models/calendar.model.js';

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
