import { serializeSelection } from './serialize-selection.js';
import { columnsOf, defineSelectionTree } from './selection-tree.js';

const TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            required: true,
            resource: 'operation',
            columns: {
                operationId: 'id',
                operationNumber: 'operationNumber',
                createdAt: 'createdAt',
            },
            alwaysKeys: ['id'],
        },
        trips: {
            property: 'trips',
            many: true,
            resource: 'tripOperationList',
            columns: columnsOf('tripId', 'nextTripOperationListId'),
            relations: {
                trip: {
                    property: 'trip',
                    many: false,
                    resource: 'trip',
                    columns: columnsOf('tripNumber', 'depotIn', 'tripName'),
                },
            },
        },
    },
});

const CREATED = new Date('2026-03-02T12:19:35.485Z');
const SOURCE = {
    operation: {
        id: 'op1',
        operationNumber: '54',
        createdAt: CREATED,
        calendarId: 'c1',
    },
    trips: [
        {
            tripId: 't1',
            nextTripOperationListId: null,
            trip: { tripNumber: '6000', depotIn: false, tripName: '' },
        },
        { tripId: 't2', nextTripOperationListId: 'tol9', trip: null },
    ],
};

describe('serializeSelection', () => {
    it('alwaysKeys → 項目 → 関連の順に組み、null・undefined は省き、false・0・空文字は残す', () => {
        const result = serializeSelection(SOURCE, TREE, {
            paths: new Set(['operation', 'trips', 'trips.trip']),
            fields: new Map(),
        });
        expect(JSON.stringify(result)).toBe(
            JSON.stringify({
                operation: {
                    id: 'op1',
                    operationId: 'op1',
                    operationNumber: '54',
                    createdAt: CREATED,
                },
                trips: [
                    {
                        tripId: 't1',
                        trip: {
                            tripNumber: '6000',
                            depotIn: false,
                            tripName: '',
                        },
                    },
                    { tripId: 't2', nextTripOperationListId: 'tol9' },
                ],
            }),
        );
    });

    it('指定の項目は指定の順に並べ、道筋に無い関連はキーごと出さない', () => {
        const result = serializeSelection(SOURCE, TREE, {
            paths: new Set(['operation']),
            fields: new Map([
                ['operation', new Set(['operationNumber', 'operationId'])],
            ]),
        });
        expect(JSON.stringify(result)).toBe(
            JSON.stringify({
                operation: {
                    id: 'op1',
                    operationNumber: '54',
                    operationId: 'op1',
                },
            }),
        );
    });

    it('配列の関連が読み込まれていなければ空の配列', () => {
        const result = serializeSelection({ operation: { id: 'op1' } }, TREE, {
            paths: new Set(['operation', 'trips']),
            fields: new Map([['operation', new Set<string>()]]),
        });
        expect(result).toEqual({ operation: { id: 'op1' }, trips: [] });
    });
});
