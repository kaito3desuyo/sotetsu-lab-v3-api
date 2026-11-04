import { SightingCorroboration } from './sighting-corroboration.read-model.js';

const corroboration = (
    overrides: Partial<Parameters<typeof SightingCorroboration.of>[0]> = {},
) =>
    SightingCorroboration.of({
        operationNumber: '12K',
        invalidated: false,
        otherOperationNumbers: [],
        ...overrides,
    });

describe('SightingCorroboration', () => {
    describe('of', () => {
        it('他の目撃が同じ運用番号なら corroborated', () => {
            expect(corroboration({ otherOperationNumbers: ['12K'] })).toBe(
                'corroborated',
            );
        });

        it('同じ運用番号が 1 件でもあれば corroborated（別の番号が混ざっていても）', () => {
            expect(
                corroboration({ otherOperationNumbers: ['58S', '12K'] }),
            ).toBe('corroborated');
        });

        it('他の目撃が別の運用番号だけなら conflicting', () => {
            expect(corroboration({ otherOperationNumbers: ['58S'] })).toBe(
                'conflicting',
            );
        });

        it('別の運用番号が複数でも同じ番号が無ければ conflicting', () => {
            expect(
                corroboration({ otherOperationNumbers: ['58S', '61K'] }),
            ).toBe('conflicting');
        });

        it('他の目撃が無ければ uncorroborated（本人の別の投稿しか無い場合もここ）', () => {
            expect(corroboration({ otherOperationNumbers: [] })).toBe(
                'uncorroborated',
            );
        });

        it('本人の投稿が無効なら、材料があっても invalidated', () => {
            expect(
                corroboration({
                    invalidated: true,
                    otherOperationNumbers: ['12K'],
                }),
            ).toBe('invalidated');
            expect(
                corroboration({
                    invalidated: true,
                    otherOperationNumbers: ['58S'],
                }),
            ).toBe('invalidated');
            expect(
                corroboration({ invalidated: true, otherOperationNumbers: [] }),
            ).toBe('invalidated');
        });

        it('ゲストの目撃（author 行なし）も他の目撃として数える: 材料は番号の配列だけなので同じ規則で裏付く', () => {
            expect(
                corroboration({
                    operationNumber: '100',
                    otherOperationNumbers: ['100'],
                }),
            ).toBe('corroborated');
        });

        it('運用番号は文字列として完全一致で比べる', () => {
            expect(corroboration({ otherOperationNumbers: ['12k'] })).toBe(
                'conflicting',
            );
            expect(corroboration({ otherOperationNumbers: ['12'] })).toBe(
                'conflicting',
            );
        });
    });

    describe('count', () => {
        it('値ごとの件数を数える', () => {
            expect(
                SightingCorroboration.count([
                    'corroborated',
                    'corroborated',
                    'invalidated',
                ]),
            ).toEqual({
                corroborated: 2,
                conflicting: 0,
                uncorroborated: 0,
                invalidated: 1,
            });
        });

        it('4 つの値がそれぞれ数えられる', () => {
            expect(
                SightingCorroboration.count([
                    'corroborated',
                    'conflicting',
                    'conflicting',
                    'uncorroborated',
                    'uncorroborated',
                    'uncorroborated',
                    'invalidated',
                ]),
            ).toEqual({
                corroborated: 1,
                conflicting: 2,
                uncorroborated: 3,
                invalidated: 1,
            });
        });

        it('空でも 4 つのキーをいつも持つ（0 を含む）', () => {
            expect(SightingCorroboration.count([])).toEqual({
                corroborated: 0,
                conflicting: 0,
                uncorroborated: 0,
                invalidated: 0,
            });
        });
    });
});
