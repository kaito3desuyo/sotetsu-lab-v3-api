import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TripFindManyByStationIdQuery } from './trip-find-many-by-station-id.query';

describe('TripFindManyByStationIdQuery', () => {
    it('tripDirection を number へ変換し検証を通過する', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: 'cal-1',
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
            calendarId: 'cal-1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'tripDirection')).toBe(true);
    });
});
