import { BadRequestException } from '@nestjs/common';
import { parseSparseFieldsets, pickFields } from './sparse-fieldsets';

const WHITELIST = {
    trip: ['tripNumber', 'tripDirection'],
    time: ['stationId', 'arrivalTime'],
    tripOperationList: ['operationId'],
    operation: ['operationNumber'],
} as const;
const REQUIRES = { operation: 'tripOperationList' } as const;

describe('parseSparseFieldsets', () => {
    it('fields が無ければ undefined（全項目を返す既定のまま）', () => {
        expect(
            parseSparseFieldsets(undefined, WHITELIST, REQUIRES),
        ).toBeUndefined();
    });

    it('資源ごとのカンマ区切りを項目の集合にする', () => {
        const result = parseSparseFieldsets(
            { trip: 'tripNumber, tripDirection', time: 'stationId' },
            WHITELIST,
            REQUIRES,
        );

        expect(result?.get('trip')).toEqual(
            new Set(['tripNumber', 'tripDirection']),
        );
        expect(result?.get('time')).toEqual(new Set(['stationId']));
        expect(result?.has('operation')).toBe(false);
    });

    it('同じ資源を繰り返し指定した配列も受け付ける', () => {
        const result = parseSparseFieldsets(
            { trip: ['tripNumber', 'tripDirection'] },
            WHITELIST,
            REQUIRES,
        );

        expect(result?.get('trip')).toEqual(
            new Set(['tripNumber', 'tripDirection']),
        );
    });

    it('空の指定は ID だけを返す資源として受け付ける', () => {
        const result = parseSparseFieldsets(
            { tripOperationList: '' },
            WHITELIST,
            REQUIRES,
        );

        expect(result?.get('tripOperationList')).toEqual(new Set());
    });

    it('許可リストに無い資源・項目は 400', () => {
        expect(() =>
            parseSparseFieldsets(
                { station: 'stationName' },
                WHITELIST,
                REQUIRES,
            ),
        ).toThrow(BadRequestException);
        expect(() =>
            parseSparseFieldsets({ trip: 'createdAt' }, WHITELIST, REQUIRES),
        ).toThrow(BadRequestException);
    });

    it('親の資源が欠けていれば 400（operation には tripOperationList が要る）', () => {
        expect(() =>
            parseSparseFieldsets(
                { operation: 'operationNumber' },
                WHITELIST,
                REQUIRES,
            ),
        ).toThrow(BadRequestException);
        expect(
            parseSparseFieldsets(
                {
                    tripOperationList: 'operationId',
                    operation: 'operationNumber',
                },
                WHITELIST,
                REQUIRES,
            ),
        ).toBeDefined();
    });

    it('fields が文字列の入れ子でなければ 400', () => {
        expect(() => parseSparseFieldsets('trip', WHITELIST, REQUIRES)).toThrow(
            BadRequestException,
        );
        expect(() =>
            parseSparseFieldsets({ trip: 1 }, WHITELIST, REQUIRES),
        ).toThrow(BadRequestException);
    });
});

describe('pickFields', () => {
    it('指定した項目と常に返す項目だけを取り出し、null・undefined は省く', () => {
        const source = {
            id: 't1',
            tripNumber: '7416',
            tripDirection: 0,
            tripName: null,
            createdAt: new Date(),
        };

        const result = pickFields(
            source,
            new Set(['tripNumber', 'tripDirection', 'tripName']),
            ['id'],
        );

        expect(result).toEqual({
            id: 't1',
            tripNumber: '7416',
            tripDirection: 0,
        });
    });

    it('false・0・空文字は省かない', () => {
        const result = pickFields(
            { depotIn: false, stopSequence: 0, tripName: '' },
            new Set(['depotIn', 'stopSequence', 'tripName']),
        );

        expect(result).toEqual({
            depotIn: false,
            stopSequence: 0,
            tripName: '',
        });
    });
});
