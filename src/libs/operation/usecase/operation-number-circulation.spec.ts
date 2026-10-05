import {
    getGroupMembers,
    getOperationGroups,
    operationNumberCirculateMap,
} from './operation-number-circulation';

describe('getOperationGroups', () => {
    it('実際の operationNumberCirculateMap から全群を導出する', () => {
        const result = getOperationGroups();

        expect(result).toEqual([
            {
                groupName: '1群',
                operationNumbers: ['11', '12', '13', '14', '15', '16'],
            },
            {
                groupName: '5群',
                operationNumbers: [
                    '51',
                    '52',
                    '53',
                    '54',
                    '55',
                    '56',
                    '57',
                    '58',
                    '59',
                ],
            },
            {
                groupName: '6群',
                operationNumbers: [
                    '61',
                    '62',
                    '63',
                    '64',
                    '65',
                    '66',
                    '67',
                    '68',
                    '69',
                ],
            },
            {
                groupName: '7群',
                operationNumbers: ['70', '71', '72', '73'],
            },
            {
                groupName: '9G群',
                operationNumbers: ['91G', '92G', '93G', '94G', '95G'],
            },
        ]);
    });

    it('任意の map（G 接尾辞なし・単一群）でも群名を導出できる', () => {
        const map = new Map([
            ['21', '22'],
            ['22', '23'],
            ['23', '21'],
        ]);

        const result = getOperationGroups(map);

        expect(result).toEqual([
            { groupName: '2群', operationNumbers: ['21', '22', '23'] },
        ]);
    });

    it('循環しない孤立ノードは単独の群として返る', () => {
        const map = new Map([['31', '32']]);

        const result = getOperationGroups(map);

        expect(result).toEqual([
            { groupName: '3群', operationNumbers: ['31', '32'] },
        ]);
    });
});

describe('getGroupMembers（既存の circulation 利用箇所と同じ挙動であることの確認）', () => {
    it('循環マップを起点から辿ってメンバーを列挙する', () => {
        expect(
            getGroupMembers('11', operationNumberCirculateMap),
        ).toEqual(['11', '12', '13', '14', '15', '16']);
    });
});
