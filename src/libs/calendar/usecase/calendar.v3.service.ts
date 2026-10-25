import { Injectable } from '@nestjs/common';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { CalendarQuery } from '../infrastructure/queries/calendar.query.js';
import { CALENDAR_SELECTION_TREE } from './calendar-selection.js';
import { CalendarDetailsDto } from './dtos/calendar-details.dto.js';

@Injectable()
export class CalendarV3Service {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(params: {
        serviceName?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findManyByServiceName({
            serviceName,
        });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, CALENDAR_SELECTION_TREE, selection),
        );
    }

    async findOne(params: {
        id: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto | Record<string, unknown> | null> {
        const { id, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findOneById({ id });
        if (!selection || !result) return result;
        return serializeSelection(result, CALENDAR_SELECTION_TREE, selection);
    }

    async findOneBySpecificDate(params: {
        date: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto | Record<string, unknown> | undefined> {
        const { date, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findOneBySpecificDate({
            date,
        });
        if (!selection || !result) return result;
        return serializeSelection(result, CALENDAR_SELECTION_TREE, selection);
    }
}
