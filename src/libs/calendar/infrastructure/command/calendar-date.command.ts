import dayjs from 'dayjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UseCaseError } from '../../../../core/classes/custom-error.js';
import { CalendarDateDtoBuilder } from '../builders/calendar-date.dto.builder.js';
import { CalendarDateModel } from '../models/calendar-date.model.js';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto.js';

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
        memo?: string | null;
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

    /** 消した行の calendarId と date を返す（失効するダイヤと、過ぎた日かを知るため） */
    async deleteOneById(params: {
        id: string;
    }): Promise<{ calendarId: string; date: string }> {
        const { id } = params;

        const result = await this.calendarDateRepository
            .createQueryBuilder()
            .delete()
            .where('id = :id', { id })
            // returning はプロパティ名で引く（列名だと黙って捨てられる）。返る行のキーは列名
            .returning(['calendarId', 'date'])
            .execute();
        const rows = result.raw as {
            calendar_id: string;
            // 列は date 型。pg は Date（その地方の 0 時）で返すので、YYYY-MM-DD にそろえる
            date: Date | string;
        }[];

        if (rows.length === 0) {
            throw new UseCaseError('指定された運行日例外が見つかりません', {
                id,
            });
        }

        const { calendar_id: calendarId, date } = rows[0];
        return {
            calendarId,
            date:
                typeof date === 'string'
                    ? date.slice(0, 10)
                    : dayjs(date).format('YYYY-MM-DD'),
        };
    }
}

function isUniqueViolation(error: unknown): boolean {
    return (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code ===
            POSTGRES_UNIQUE_VIOLATION_CODE
    );
}
