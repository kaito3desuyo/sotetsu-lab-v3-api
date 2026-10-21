import dayjs from 'dayjs';
import { ValueObject } from './value-object.js';

class Sample extends ValueObject<Record<string, unknown>> {}

describe('ValueObject.isEqual', () => {
    it('入れ子のオブジェクトと配列の中身が同じなら等しい', () => {
        const a = new Sample({ n: 1, nested: { list: [1, 2, { x: 'a' }] } });
        const b = new Sample({ n: 1, nested: { list: [1, 2, { x: 'a' }] } });
        expect(a.isEqual(b)).toBe(true);
    });

    it('入れ子の値が違えば等しくない', () => {
        const a = new Sample({ nested: { list: [1, 2] } });
        const b = new Sample({ nested: { list: [2, 1] } });
        expect(a.isEqual(b)).toBe(false);
    });

    it('同じ時刻の Date・dayjs は等しく、違う時刻なら等しくない', () => {
        const t = '2026-10-21T12:00:00+09:00';
        expect(
            new Sample({ d: new Date(t), j: dayjs(t) }).isEqual(
                new Sample({ d: new Date(t), j: dayjs(t) }),
            ),
        ).toBe(true);
        expect(
            new Sample({ d: new Date(t) }).isEqual(
                new Sample({ d: new Date('2026-10-21T12:00:01+09:00') }),
            ),
        ).toBe(false);
    });

    it('undefined のプロパティがある側と無い側は等しくない', () => {
        expect(new Sample({ a: undefined }).isEqual(new Sample({}))).toBe(
            false,
        );
    });

    it('null・undefined と比べると等しくない', () => {
        const a = new Sample({ n: 1 });
        expect(a.isEqual(undefined)).toBe(false);
        expect(a.isEqual(null as unknown as Sample)).toBe(false);
    });
});
