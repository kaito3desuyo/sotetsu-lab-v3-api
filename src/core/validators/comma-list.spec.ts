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
});
