import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
    calendarCacheTag,
    pastDateCacheTags,
} from '../../../core/modules/cdn-invalidation/cache-tags.js';
import { CdnInvalidation } from '../../../core/modules/cdn-invalidation/cdn-invalidation.js';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { CalendarDateCommand } from '../infrastructure/command/calendar-date.command.js';
import { CalendarDateModel } from '../infrastructure/models/calendar-date.model.js';
import { CalendarDateQuery } from '../infrastructure/queries/calendar-date.query.js';
import { CALENDAR_DATE_SELECTION_TREE } from './calendar-selection.js';
import { CalendarDateDetailsDto } from './dtos/calendar-date-details.dto.js';

@Injectable()
export class CalendarDateV3Service {
    constructor(
        private readonly calendarDateQuery: CalendarDateQuery,
        private readonly calendarDateCommand: CalendarDateCommand,
        private readonly cdnInvalidation: CdnInvalidation,
    ) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(params: {
        calendarId?: string;
        from?: string;
        to?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDateDetailsDto[] | Record<string, unknown>[]> {
        const { calendarId, from, to, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_DATE_SELECTION_TREE,
        );
        const result = await this.calendarDateQuery.findMany({
            calendarId,
            from,
            to,
        });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, CALENDAR_DATE_SELECTION_TREE, selection),
        );
    }

    async create(params: {
        calendarId: string;
        date: string;
        exceptionType: CalendarDateModel['exceptionType'];
        memo?: string | null;
    }): Promise<CalendarDateDetailsDto> {
        const result = await this.calendarDateCommand.create(params);
        await this.#invalidate(result);
        return result;
    }

    async deleteOneById(params: { id: string }): Promise<void> {
        const row = await this.calendarDateCommand.deleteOneById(params);
        await this.#invalidate(row);
    }

    /**
     * そのダイヤの画面を捨てる。過ぎた日の行なら、その日の過去の運用情報（sighting-date のタグ）も捨てる
     * （過去の運用情報は、その日のダイヤを calendar_dates も見て引くため）。
     */
    async #invalidate(row: {
        calendarId: string;
        date: string;
    }): Promise<void> {
        await this.cdnInvalidation.invalidate({
            tags: [
                calendarCacheTag(row.calendarId),
                ...pastDateCacheTags({ dates: [row.date], now: dayjs() }),
            ],
        });
    }
}
