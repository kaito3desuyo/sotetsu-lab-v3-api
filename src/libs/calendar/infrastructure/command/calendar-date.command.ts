import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UseCaseError } from 'src/core/classes/custom-error';
import { CalendarDateDtoBuilder } from '../builders/calendar-date.dto.builder';
import { CalendarDateModel } from '../models/calendar-date.model';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class CalendarDateCommand {
    constructor(
        @InjectRepository(CalendarDateModel)
        private readonly calendarDateRepository: Repository<CalendarDateModel>,
    ) {}

    async create(params: {
        calendarId: string;
        date: string;
        exceptionType: CalendarDateModel['exceptionType'];
        memo?: string;
    }): Promise<CalendarDateDetailsDto> {
        const { calendarId, date, exceptionType, memo } = params;

        const model = this.calendarDateRepository.create({
            calendarId,
            date,
            exceptionType,
            memo: memo ?? null,
        });

        try {
            const result = await this.calendarDateRepository.save(model);
            return CalendarDateDtoBuilder.buildFromModel(result);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new UseCaseError(
                    '同一カレンダー・同一日付の運行日例外は既に登録されています',
                    { calendarId, date },
                );
            }

            throw error;
        }
    }

    async deleteOneById(params: { id: string }): Promise<void> {
        const { id } = params;

        const result = await this.calendarDateRepository.delete({ id });

        if (!result.affected) {
            throw new UseCaseError('指定された運行日例外が見つかりません', {
                id,
            });
        }
    }
}

function isUniqueViolation(error: unknown): boolean {
    return (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code ===
            POSTGRES_UNIQUE_VIOLATION_CODE
    );
}
