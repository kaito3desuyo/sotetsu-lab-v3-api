import { Injectable } from '@nestjs/common';
import { calendarCacheTags } from '../../../core/modules/cdn-invalidation/cache-tags.js';
import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import type { ItinerarySegment } from '../domain/itinerary-link-rule.domain.js';
import { ItinerarySegmentQuery } from '../infrastructure/queries/itinerary-segment.query.js';

/** 運用の区間を共有キャッシュ越しに読む。ダイヤの書き込みで calendar:<id> のタグが捨てられる。 */
@Injectable()
export class ItinerarySegmentReader {
    constructor(
        private readonly itinerarySegmentQuery: ItinerarySegmentQuery,
        private readonly sharedCache: SharedCache,
    ) {}

    findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<ItinerarySegment[]> {
        return this.sharedCache.getOrLoad<ItinerarySegment[]>({
            namespace: 'itinerary-segments',
            key: [params.calendarId],
            tags: calendarCacheTags([params.calendarId]),
            load: () => this.itinerarySegmentQuery.findManyByCalendarId(params),
        });
    }
}
