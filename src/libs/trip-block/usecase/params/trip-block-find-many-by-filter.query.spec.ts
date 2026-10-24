import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validatorOptions } from '../../../../core/configs/validator-options.js';
import { TripBlockFindManyByFilterQuery } from './trip-block-find-many-by-filter.query.js';

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

    it('include をカンマ区切りの文字列で受け取り、アプリ全体と同じ設定（whitelist）で落とさない', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            include: 'trips.times,trips.tripClass',
        });

        const errors = await validate(query, validatorOptions);

        expect(errors).toHaveLength(0);
        expect(query.include).toBe('trips.times,trips.tripClass');
    });

    it('include を繰り返し指定した配列でも受け取る', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            include: ['trips.times', 'trips.tripClass'],
        });

        const errors = await validate(query, validatorOptions);

        expect(errors).toHaveLength(0);
    });

    it('include が崩れた形（オブジェクト）でも DTO では落とさない（サービスの parseSelection が 400 にする）', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            include: { a: 'b' },
        });

        const errors = await validate(query, validatorOptions);

        expect(errors.some((e) => e.property === 'include')).toBe(false);
        expect(query.include).toEqual({ a: 'b' });
    });
});
