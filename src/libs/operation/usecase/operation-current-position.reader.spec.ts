import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import { OperationQuery } from '../infrastructure/queries/operation.query.js';
import { OperationCurrentPositionReader } from './operation-current-position.reader.js';

type LoadParams = { load: () => Promise<unknown> };

function build(options?: {
    models?: { id: string }[];
    calendarIds?: string[];
    cached?: { id: string }[];
}) {
    const query = {
        findCalendarIdsByOperationIds: vi
            .fn()
            .mockResolvedValue(options?.calendarIds ?? ['c1']),
        findManyForCurrentPosition: vi
            .fn()
            .mockResolvedValue(options?.models ?? []),
    };
    const getOrLoad = vi.fn(async (params: LoadParams) =>
        options?.cached ? options.cached : params.load(),
    );
    const reader = new OperationCurrentPositionReader(
        query as unknown as OperationQuery,
        { getOrLoad } as unknown as SharedCache,
    );
    return { reader, query, getOrLoad };
}

describe('OperationCurrentPositionReader', () => {
    it('名前空間 operation-current-positions、キーは並べ替えて重ねない id、タグはダイヤから作る', async () => {
        const { reader, query, getOrLoad } = build({
            models: [{ id: 'a' }, { id: 'b' }],
            calendarIds: ['C1'],
        });

        await reader.findManyForCurrentPosition({
            operationIds: ['b', 'a', 'b'],
        });

        expect(query.findCalendarIdsByOperationIds).toHaveBeenCalledWith({
            operationIds: ['a', 'b'],
        });
        expect(getOrLoad).toHaveBeenCalledWith(
            expect.objectContaining({
                namespace: 'operation-current-positions',
                key: ['a', 'b'],
                tags: ['calendar:c1'],
            }),
        );
        expect(query.findManyForCurrentPosition).toHaveBeenCalledWith({
            operationIds: ['a', 'b'],
        });
    });

    it('id の順と重なりが違ってもキーが同じ', async () => {
        const first = build();
        const second = build();

        await first.reader.findManyForCurrentPosition({
            operationIds: ['a', 'b'],
        });
        await second.reader.findManyForCurrentPosition({
            operationIds: ['b', 'a', 'a'],
        });

        expect(first.getOrLoad.mock.calls[0][0]).toMatchObject({
            key: ['a', 'b'],
        });
        expect(second.getOrLoad.mock.calls[0][0]).toMatchObject({
            key: ['a', 'b'],
        });
    });

    it('id が空なら DB にもキャッシュにも行かない', async () => {
        const { reader, query, getOrLoad } = build();

        await expect(
            reader.findManyForCurrentPosition({ operationIds: [] }),
        ).resolves.toEqual([]);

        expect(query.findCalendarIdsByOperationIds).not.toHaveBeenCalled();
        expect(query.findManyForCurrentPosition).not.toHaveBeenCalled();
        expect(getOrLoad).not.toHaveBeenCalled();
    });

    it('bypass を getOrLoad に渡す', async () => {
        const { reader, getOrLoad } = build();

        await reader.findManyForCurrentPosition({
            operationIds: ['a'],
            bypass: true,
        });

        expect(getOrLoad).toHaveBeenCalledWith(
            expect.objectContaining({ bypass: true }),
        );
    });

    it('キャッシュの値は要求の id の順に並べて返す', async () => {
        const { reader } = build({
            cached: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        });

        const result = await reader.findManyForCurrentPosition({
            operationIds: ['c', 'x', 'a'],
        });

        expect(result.map((m) => m.id)).toEqual(['c', 'a']);
    });
});
