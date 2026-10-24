import { BadRequestException } from '@nestjs/common';
import { parseFieldsOnly, parseSelection } from './parse-selection.js';
import { columnsOf, defineSelectionTree } from './selection-tree.js';

const TREE = defineSelectionTree({
    resource: null,
    columns: columnsOf('id'),
    alwaysKeys: ['id'],
    relations: {
        trips: {
            property: 'trips',
            many: true,
            required: true,
            resource: 'trip',
            columns: columnsOf('tripNumber', 'tripName'),
            alwaysKeys: ['id'],
            relations: {
                times: {
                    property: 'times',
                    many: true,
                    resource: 'time',
                    columns: columnsOf('id', 'stationId', 'arrivalTime'),
                },
                operation: {
                    property: 'operation',
                    many: false,
                    resource: 'operation',
                    columns: {
                        operationId: 'id',
                        operationNumber: 'operationNumber',
                    },
                    relations: {
                        calendar: {
                            property: 'calendar',
                            many: false,
                            resource: 'calendar',
                            columns: columnsOf('calendarName'),
                        },
                    },
                },
            },
        },
    },
});

// include を受けない口（関連がすべて required）
const REQUIRED_ONLY_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        stations: {
            property: 'stations',
            many: true,
            required: true,
            resource: 'station',
            columns: columnsOf('stationName'),
        },
    },
});

function expect400(run: () => unknown, message: string): void {
    expect(run).toThrow(BadRequestException);
    expect(run).toThrow(message);
}

describe('parseSelection - 指定なし', () => {
    it('include も fields も無ければ undefined（全部入りのまま）', () => {
        expect(parseSelection({}, TREE)).toBeUndefined();
        expect(
            parseSelection({ include: null, fields: undefined }, TREE),
        ).toBeUndefined();
    });
});

describe('parseSelection - fields だけ（今の trip-blocks と同じ動き）', () => {
    it('名前を挙げた資源の関連を結合する', () => {
        const selection = parseSelection(
            { fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('trip')).toEqual(new Set(['tripNumber']));
        expect(selection?.fields.get('time')).toEqual(
            new Set(['stationId', 'arrivalTime']),
        );
    });

    it('required の関連の資源で名前の無いものは alwaysKeys だけ（空の項目）にする', () => {
        const selection = parseSelection(
            { fields: { time: 'stationId' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('trip')).toEqual(new Set());
    });

    it('同じ資源を繰り返し指定した配列も受け付ける', () => {
        const selection = parseSelection(
            { fields: { time: ['stationId', 'arrivalTime'] } },
            TREE,
        );
        expect(selection?.fields.get('time')).toEqual(
            new Set(['stationId', 'arrivalTime']),
        );
    });

    it('空白と空の項目は捨てる', () => {
        const selection = parseSelection(
            { fields: { trip: ' tripNumber , ,' } },
            TREE,
        );
        expect(selection?.fields.get('trip')).toEqual(new Set(['tripNumber']));
    });

    it('親の資源が欠けていれば 400', () => {
        expect400(
            () =>
                parseSelection({ fields: { calendar: 'calendarName' } }, TREE),
            'fields[calendar] には fields[operation] の指定も要る',
        );
    });

    it('fields が文字列の入れ子でなければ 400', () => {
        expect400(
            () => parseSelection({ fields: 'tripNumber' }, TREE),
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
        expect400(
            () => parseSelection({ fields: ['tripNumber'] }, TREE),
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
        expect400(
            () => parseSelection({ fields: { trip: { a: 'b' } } }, TREE),
            'fields[trip] は文字列で指定する',
        );
    });

    it('木に無い資源・項目は 400', () => {
        expect400(
            () => parseSelection({ fields: { user: 'password' } }, TREE),
            'fields に指定できない資源: user',
        );
        expect400(
            () => parseSelection({ fields: { trip: 'password' } }, TREE),
            'fields[trip] に指定できない項目: password',
        );
        // alwaysKeys は columns に無いので選べない（常に返る）
        expect400(
            () => parseSelection({ fields: { trip: 'id' } }, TREE),
            'fields[trip] に指定できない項目: id',
        );
        // 資源を持たない根は選べない
        expect400(
            () => parseSelection({ fields: { tripBlock: 'id' } }, TREE),
            'fields に指定できない資源: tripBlock',
        );
    });
});

describe('parseSelection - include', () => {
    it('子を挙げれば親も付き、required の関連は常に付く', () => {
        const selection = parseSelection(
            { include: 'trips.operation.calendar' },
            TREE,
        );
        expect(selection?.paths).toEqual(
            new Set(['trips', 'trips.operation', 'trips.operation.calendar']),
        );
        expect(selection?.fields.size).toBe(0);
    });

    it('配列・空白・末尾のカンマを受け付ける', () => {
        const selection = parseSelection(
            { include: ['trips.times', ' trips.operation ,'] },
            TREE,
        );
        expect(selection?.paths).toEqual(
            new Set(['trips', 'trips.times', 'trips.operation']),
        );
    });

    it('空の include は required の関連だけ', () => {
        expect(parseSelection({ include: '' }, TREE)?.paths).toEqual(
            new Set(['trips']),
        );
    });

    it('fields と併せたとき、fields は列だけを絞る', () => {
        const selection = parseSelection(
            { include: 'trips.times', fields: { time: 'stationId' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('time')).toEqual(new Set(['stationId']));
        // include のときは、名前の無い資源は全列（空の項目を入れない）
        expect(selection?.fields.has('trip')).toBe(false);
    });

    it('結合されない資源の fields は 400', () => {
        expect400(
            () =>
                parseSelection(
                    {
                        include: 'trips.operation',
                        fields: { time: 'stationId' },
                    },
                    TREE,
                ),
            'fields[time] の資源は include に含まれていない',
        );
    });

    it('木に無い道筋は 400', () => {
        expect400(
            () => parseSelection({ include: 'trips.service' }, TREE),
            'include に指定できない道筋: trips.service',
        );
        expect400(
            () => parseSelection({ include: 'times' }, TREE),
            'include に指定できない道筋: times',
        );
    });

    it('文字列でなければ 400', () => {
        expect400(
            () => parseSelection({ include: { a: 'b' } }, TREE),
            'include は道筋をカンマで区切って指定する',
        );
    });

    it('選べる関連の無い口では 400', () => {
        expect400(
            () => parseSelection({ include: '' }, REQUIRED_ONLY_TREE),
            'この口は include を指定できない',
        );
    });
});

describe('parseFieldsOnly', () => {
    const tree = defineSelectionTree({
        resource: null,
        columns: {},
        relations: {
            operation: {
                property: 'operation',
                many: false,
                resource: 'operation',
                columns: columnsOf('id', 'operationNumber'),
                alwaysKeys: ['id'],
            },
            current: {
                property: 'current',
                many: false,
                resource: 'tripOperationList',
                columns: columnsOf('id', 'tripId'),
                alwaysKeys: ['id'],
                relations: {
                    trip: {
                        property: 'trip',
                        many: false,
                        resource: 'trip',
                        columns: columnsOf('tripNumber', 'depotIn'),
                        alwaysKeys: ['id'],
                    },
                },
            },
        },
    });

    it('fields が無ければ undefined', () => {
        expect(parseFieldsOnly({}, tree)).toBeUndefined();
    });

    it('挙げた資源だけを削り、関連はすべて返す', () => {
        expect(
            parseFieldsOnly({ fields: { trip: 'tripNumber' } }, tree),
        ).toEqual({
            paths: new Set(['operation', 'current', 'current.trip']),
            fields: new Map([['trip', new Set(['tripNumber'])]]),
        });
    });

    it('include は空でも 400', () => {
        expect(() => parseFieldsOnly({ include: '' }, tree)).toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(() =>
            parseFieldsOnly(
                { include: 'current', fields: { trip: 'tripNumber' } },
                tree,
            ),
        ).toThrow(BadRequestException);
    });

    it('fields の検めは parseSelection と同じ', () => {
        expect(() => parseFieldsOnly({ fields: 'tripNumber' }, tree)).toThrow(
            new BadRequestException(
                'fields は fields[資源]=項目,項目 の形で指定する',
            ),
        );
        expect(() =>
            parseFieldsOnly({ fields: { user: 'password' } }, tree),
        ).toThrow(new BadRequestException('fields に指定できない資源: user'));
        expect(() =>
            parseFieldsOnly({ fields: { trip: 'password' } }, tree),
        ).toThrow(
            new BadRequestException(
                'fields[trip] に指定できない項目: password',
            ),
        );
    });
});
