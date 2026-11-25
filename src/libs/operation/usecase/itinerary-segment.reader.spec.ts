import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import { ItinerarySegmentQuery } from '../infrastructure/queries/itinerary-segment.query.js';
import { ItinerarySegmentReader } from './itinerary-segment.reader.js';

describe('ItinerarySegmentReader', () => {
    it('namespace itinerary-segments・key [calendarId]・タグ calendar:<calendarId> で getOrLoad し、load は ItinerarySegmentQuery を呼ぶ', async () => {
        const segments = [{ id: 's1' }];
        const query = {
            findManyByCalendarId: vi.fn().mockResolvedValue(segments),
        };
        const getOrLoad = vi.fn(
            async (params: { load: () => Promise<unknown> }) => params.load(),
        );
        const reader = new ItinerarySegmentReader(
            query as unknown as ItinerarySegmentQuery,
            { getOrLoad } as unknown as SharedCache,
        );

        const result = await reader.findManyByCalendarId({
            calendarId: 'ABC',
        });

        expect(result).toBe(segments);
        expect(getOrLoad).toHaveBeenCalledWith(
            expect.objectContaining({
                namespace: 'itinerary-segments',
                key: ['ABC'],
                tags: ['calendar:abc'],
            }),
        );
        expect(query.findManyByCalendarId).toHaveBeenCalledWith({
            calendarId: 'ABC',
        });
    });
});
