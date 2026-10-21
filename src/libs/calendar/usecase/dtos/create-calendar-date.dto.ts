import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableCalendarDateDto } from './validatable-calendar-date.dto.js';

export class CreateCalendarDateDto extends ValidatableCalendarDateDto<undefined> {
    @IsOptional()
    @Exclude()
    id: undefined;
}
