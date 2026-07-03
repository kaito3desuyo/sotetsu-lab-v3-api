import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
    CalendarDateExceptionType,
} from '../models/calendar-date.model';

export interface CalendarDateCandidate {
    id: string;
    dayOfWeekMatches: boolean;
}

export interface CalendarDateExceptionCandidate {
    calendarId: string;
    exceptionType: CalendarDateExceptionType;
}

/**
 * 「(曜日規則マッチ AND NOT EXISTS type2) OR EXISTS type1」の判定を行い、
 * 該当するカレンダー ID を返す（先勝ち。既存の qb.getOne() の挙動を踏襲）。
 * exceptions が空の場合は曜日規則のみの従来判定と完全一致する。
 */
export function resolveCalendarIdBySpecificDate(params: {
    candidates: CalendarDateCandidate[];
    exceptions: CalendarDateExceptionCandidate[];
}): string | null {
    const { candidates, exceptions } = params;

    const addedCalendarIds = new Set(
        exceptions
            .filter((e) => e.exceptionType === CALENDAR_DATE_EXCEPTION_TYPE_ADDED)
            .map((e) => e.calendarId),
    );
    const removedCalendarIds = new Set(
        exceptions
            .filter((e) => e.exceptionType === CALENDAR_DATE_EXCEPTION_TYPE_REMOVED)
            .map((e) => e.calendarId),
    );

    const match = candidates.find((candidate) => {
        const ruleMatch =
            candidate.dayOfWeekMatches && !removedCalendarIds.has(candidate.id);
        const additionMatch = addedCalendarIds.has(candidate.id);

        return ruleMatch || additionMatch;
    });

    return match ? match.id : null;
}
