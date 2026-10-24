import { selectColumns } from './select-columns.js';
import { columnsOf } from './selection-tree.js';

const OPERATION = {
    resource: 'operation',
    columns: {
        operationId: 'id',
        calendarId: 'calendarId',
        operationNumber: 'operationNumber',
    },
    alwaysKeys: ['id'],
};

describe('selectColumns', () => {
    it('主キー・alwaysKeys・指定の列を、別名つきで重複なく返す', () => {
        const selection = {
            paths: new Set<string>(),
            fields: new Map([
                ['operation', new Set(['operationId', 'operationNumber'])],
            ]),
        };
        expect(selectColumns('operation', OPERATION, selection)).toEqual([
            'operation.id',
            'operation.operationNumber',
        ]);
    });

    it('指定が無ければ全列', () => {
        const selection = { paths: new Set<string>(), fields: new Map() };
        expect(selectColumns('operation', OPERATION, selection)).toEqual([
            'operation.id',
            'operation.calendarId',
            'operation.operationNumber',
        ]);
    });

    it('空の指定なら主キーと alwaysKeys だけ', () => {
        const selection = {
            paths: new Set<string>(),
            fields: new Map([['trip', new Set<string>()]]),
        };
        const trip = {
            resource: 'trip',
            columns: columnsOf('tripNumber'),
            alwaysKeys: ['id'],
        };
        expect(selectColumns('trips', trip, selection)).toEqual(['trips.id']);
    });
});
