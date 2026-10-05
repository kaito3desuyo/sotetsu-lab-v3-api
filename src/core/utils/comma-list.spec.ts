import { parseCommaList } from './comma-list';

describe('parseCommaList', () => {
    it('空要素・前後の空白・重複を捨てる', () => {
        expect(parseCommaList(' a,,b, a ,c')).toEqual(['a', 'b', 'c']);
    });

    it('undefined なら空配列', () => {
        expect(parseCommaList(undefined)).toEqual([]);
    });
});
