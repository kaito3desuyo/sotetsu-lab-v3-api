import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validatorOptions } from 'src/core/configs/validator-options';
import { TripBlockFindManyByFilterQuery } from './trip-block-find-many-by-filter.query';

describe('TripBlockFindManyByFilterQuery', () => {
    it('tripDirection を number へ変換し検証を通過する', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '1',
        });

        const errors = await validate(query);

        expect(errors).toHaveLength(0);
        expect(query.tripDirection).toBe(1);
        expect(typeof query.tripDirection).toBe('number');
    });

    it('calendarId が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            tripDirection: '1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'calendarId')).toBe(true);
    });

    it('tripDirection が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'tripDirection')).toBe(true);
    });

    it('fields の入れ子（fields[資源]=項目）を受け取り、アプリ全体と同じ設定（whitelist）で落とさない', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
        });

        const errors = await validate(query, validatorOptions);

        expect(errors).toHaveLength(0);
        expect(query.fields).toEqual({
            trip: 'tripNumber',
            time: 'stationId,arrivalTime',
        });
    });

    it('fields が入れ子でなければ検証エラー', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            fields: 'tripNumber',
        });

        const errors = await validate(query, validatorOptions);

        expect(errors.some((e) => e.property === 'fields')).toBe(true);
    });
});
