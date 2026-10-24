import { columnsOf, defineSelectionTree } from './selection-tree.js';

describe('columnsOf', () => {
    it('応答の項目名とプロパティ名が同じ列の対応を作る', () => {
        expect(columnsOf('id', 'tripNumber')).toEqual({
            id: 'id',
            tripNumber: 'tripNumber',
        });
    });
});

describe('defineSelectionTree', () => {
    it('木をそのまま返す', () => {
        const tree = { resource: null, columns: {} };
        expect(defineSelectionTree(tree)).toBe(tree);
    });

    it('同じ資源の columns が食い違えば定義の誤りとして投げる', () => {
        expect(() =>
            defineSelectionTree({
                resource: null,
                columns: {},
                relations: {
                    startTime: {
                        property: 'startTime',
                        many: false,
                        resource: 'time',
                        columns: columnsOf('stationId'),
                    },
                    endTime: {
                        property: 'endTime',
                        many: false,
                        resource: 'time',
                        columns: columnsOf('stationId', 'arrivalTime'),
                    },
                },
            }),
        ).toThrow('資源 time の columns が endTime で食い違う');
    });
});
