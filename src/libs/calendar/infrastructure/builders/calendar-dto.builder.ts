import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export function buildCalendarDetailsDto(
    model: CalendarModel,
): CalendarDetailsDto {
    return plainToClass(CalendarDetailsDto, model, transformerOptions);
}
