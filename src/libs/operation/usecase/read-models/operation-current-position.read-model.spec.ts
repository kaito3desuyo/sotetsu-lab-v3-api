import 'reflect-metadata';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { OperationModel } from '../../infrastructure/models/operation.model.js';
import { buildOperationCurrentPosition } from './operation-current-position.read-model.js';

dayjs.extend(customParseFormat);

type Time = { days: number; time: string };

const tol = (id: string, start: Time | undefined, end: Time | undefined) => ({
    id,
    startTime: start && {
        departureDays: start.days,
        departureTime: start.time,
    },
    endTime: end && { arrivalDays: end.days, arrivalTime: end.time },
});

const operationOf = (
    tripOperationLists: ReturnType<typeof tol>[],
): OperationModel =>
    ({
        id: 'op-1',
        calendarId: 'cal-1',
        operationNumber: '11K',
        tripOperationLists,
    }) as unknown as OperationModel;

const ids = async (
    trips: ReturnType<typeof tol>[],
    searchTime: string | undefined,
) => {
    const result = await buildOperationCurrentPosition(
        operationOf(trips),
        searchTime,
    );
    return {
        operation: result.operation.id,
        prev: result.prev?.id ?? null,
        current: result.current?.id ?? null,
        next: result.next?.id ?? null,
    };
};

// 10:00-11:00 と 12:00-13:00 の 2 本
const twoTrips = [
    tol('t1', { days: 1, time: '10:00:00' }, { days: 1, time: '11:00:00' }),
    tol('t2', { days: 1, time: '12:00:00' }, { days: 1, time: '13:00:00' }),
];

describe('buildOperationCurrentPosition', () => {
    it('列車が 1 本も無い運用は prev・current・next とも null', async () => {
        expect(await ids([], '2026-10-21T10:30:00+09:00')).toEqual({
            operation: 'op-1',
            prev: null,
            current: null,
            next: null,
        });
    });

    it('検索時刻が最初の列車の出発より前なら next に最初の列車', async () => {
        expect(await ids(twoTrips, '2026-10-21T09:00:00+09:00')).toEqual({
            operation: 'op-1',
            prev: null,
            current: null,
            next: 't1',
        });
    });

    it('検索時刻が列車の走行中なら current にその列車', async () => {
        expect(await ids(twoTrips, '2026-10-21T10:30:00+09:00')).toEqual({
            operation: 'op-1',
            prev: null,
            current: 't1',
            next: null,
        });
        expect(await ids(twoTrips, '2026-10-21T12:30:00+09:00')).toEqual({
            operation: 'op-1',
            prev: null,
            current: 't2',
            next: null,
        });
    });

    it('出発の時刻ちょうどは走行中、到着の時刻ちょうどは走行外', async () => {
        expect(await ids(twoTrips, '2026-10-21T10:00:00+09:00')).toMatchObject({
            current: 't1',
        });
        expect(await ids(twoTrips, '2026-10-21T11:00:00+09:00')).toMatchObject({
            prev: 't1',
            next: 't2',
            current: null,
        });
    });

    it('検索時刻が列車と列車の間なら prev に前の列車・next に次の列車', async () => {
        expect(await ids(twoTrips, '2026-10-21T11:30:00+09:00')).toEqual({
            operation: 'op-1',
            prev: 't1',
            current: null,
            next: 't2',
        });
    });

    it('検索時刻が最後の列車の到着より後なら prev に最後の列車', async () => {
        expect(await ids(twoTrips, '2026-10-21T14:00:00+09:00')).toEqual({
            operation: 'op-1',
            prev: 't2',
            current: null,
            next: null,
        });
        expect(await ids(twoTrips, '2026-10-21T13:00:00+09:00')).toMatchObject({
            prev: 't2',
        });
    });

    it('0 時台に着く列車（到着が 24 時を超える）の走行中を判定する', async () => {
        const trips = [
            tol(
                't1',
                { days: 1, time: '23:30:00' },
                { days: 2, time: '00:20:00' },
            ),
        ];
        // 検索時刻が 0 時台なら、前日の運行日の列車として扱う
        expect(await ids(trips, '2026-10-22T00:10:00+09:00')).toMatchObject({
            current: 't1',
        });
        expect(await ids(trips, '2026-10-22T00:20:00+09:00')).toMatchObject({
            prev: 't1',
            current: null,
        });
        expect(await ids(trips, '2026-10-21T23:00:00+09:00')).toMatchObject({
            next: 't1',
        });
    });

    it('0 時台に出発する列車（days が 2）を前の列車の後ろに並べて判定する', async () => {
        const trips = [
            tol(
                't1',
                { days: 1, time: '23:00:00' },
                { days: 1, time: '23:50:00' },
            ),
            tol(
                't2',
                { days: 2, time: '00:10:00' },
                { days: 2, time: '00:50:00' },
            ),
        ];
        expect(await ids(trips, '2026-10-22T00:00:00+09:00')).toMatchObject({
            prev: 't1',
            next: 't2',
            current: null,
        });
        expect(await ids(trips, '2026-10-22T00:30:00+09:00')).toMatchObject({
            current: 't2',
        });
        // 4 時以降は同じ日付の 1 日目として扱うので、まだ 1 日目の列車より前
        expect(await ids(trips, '2026-10-22T04:00:00+09:00')).toMatchObject({
            next: 't1',
        });
    });

    it('同じ時刻に着いて発つ列車は、その時刻から次の列車が current になる', async () => {
        const trips = [
            tol(
                't1',
                { days: 1, time: '10:00:00' },
                { days: 1, time: '11:00:00' },
            ),
            tol(
                't2',
                { days: 1, time: '11:00:00' },
                { days: 1, time: '12:00:00' },
            ),
        ];
        expect(await ids(trips, '2026-10-21T10:59:59+09:00')).toMatchObject({
            current: 't1',
        });
        expect(await ids(trips, '2026-10-21T11:00:00+09:00')).toEqual({
            operation: 'op-1',
            prev: null,
            current: 't2',
            next: null,
        });
        expect(await ids(trips, '2026-10-21T11:30:00+09:00')).toMatchObject({
            current: 't2',
            prev: null,
        });
    });

    it('出発の時刻（startTime）が結合できない列車があれば UnexpectedError', async () => {
        await expect(
            ids(
                [tol('t1', undefined, { days: 1, time: '11:00:00' })],
                '2026-10-21T10:30:00+09:00',
            ),
        ).rejects.toThrow(UnexpectedError);
    });

    it('到着の時刻（endTime）が結合できない列車があれば UnexpectedError', async () => {
        await expect(
            ids(
                [tol('t1', { days: 1, time: '10:00:00' }, undefined)],
                '2026-10-21T10:30:00+09:00',
            ),
        ).rejects.toThrow(UnexpectedError);
    });
});
