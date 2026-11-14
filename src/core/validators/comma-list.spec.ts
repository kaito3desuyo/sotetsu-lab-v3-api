import { plainToInstance } from 'class-transformer';
import { CommaList } from './comma-list.js';

class Sample {
    @CommaList()
    numbers?: string[];
}

describe('CommaList', () => {
    it('"11, 31G,,11" を ["11","31G"] にする', () => {
        const result = plainToInstance(Sample, { numbers: '11, 31G,,11' });
        expect(result.numbers).toEqual(['11', '31G']);
    });

    it('未指定は undefined のまま', () => {
        const result = plainToInstance(Sample, {});
        expect(result.numbers).toBeUndefined();
    });

    it('空文字列は空配列にする', () => {
        expect(plainToInstance(Sample, { numbers: '' }).numbers).toEqual([]);
    });

    it('配列・オブジェクトは例外にせずそのまま返す', () => {
        expect(
            plainToInstance(Sample, { numbers: ['1', '2'] }).numbers,
        ).toEqual(['1', '2']);
        expect(
            plainToInstance(Sample, { numbers: { a: '1' } }).numbers,
        ).toEqual({ a: '1' });
    });
});
