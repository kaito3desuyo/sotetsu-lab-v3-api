import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TripFindManyByStationIdQuery } from './trip-find-many-by-station-id.query.js';

const CALENDAR_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('TripFindManyByStationIdQuery', () => {
    it('tripDirection を number へ変換し検証を通過する', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: CALENDAR_ID,
            tripDirection: '0',
        });

        const errors = await validate(query);

        expect(errors).toHaveLength(0);
        expect(query.tripDirection).toBe(0);
        expect(typeof query.tripDirection).toBe('number');
    });

    it('calendarId が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            tripDirection: '0',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'calendarId')).toBe(true);
    });

    it('tripDirection が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: CALENDAR_ID,
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'tripDirection')).toBe(true);
    });

    it.each(['undefined', 'not-a-uuid', '123'])(
        'calendarId が UUID でない（%s）場合は検証エラーになる（422）',
        async (value) => {
            const query = plainToInstance(TripFindManyByStationIdQuery, {
                calendarId: value,
                tripDirection: 0,
            });

            const errors = await validate(query);

            expect(errors.some((e) => e.property === 'calendarId')).toBe(true);
        },
    );

    it('calendarId が UUID なら検証を通過する', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: CALENDAR_ID,
            tripDirection: 0,
        });

        const errors = await validate(query);

        expect(errors).toHaveLength(0);
    });
});
