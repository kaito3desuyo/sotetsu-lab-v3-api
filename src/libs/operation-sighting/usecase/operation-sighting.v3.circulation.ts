import dayjs from 'dayjs';
import { getBaseDate } from '../../../core/utils/datetime.js';
import { buildCirculationPath } from '../../operation/usecase/operation-number-circulation.js';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain.js';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto.js';

export type CacheAction =
    | { type: 'none' }
    | {
          type: 'upsert';
          cacheId: string | undefined;
          formationNumber: string;
          operationNumber: string;
      }
    | {
          type: 'rollback';
          cacheId: string;
          formationNumber: string;
          operationNumber: string;
          operationSightingId: string;
      }
    | { type: 'delete'; domain: OperationSightingLatestCache };

export function selectMostRecentCandidateForOperationNumber(
    caches: OperationSightingLatestCacheDto[],
    targetOperationNumber: string,
    searchBaseDate: dayjs.Dayjs,
): OperationSightingLatestCacheDto | null {
    const candidates = caches.filter((row) => {
        const daysAgo = searchBaseDate.diff(
            getBaseDate(dayjs(row.sightingTime)),
            'day',
        );
        return (
            buildCirculationPath(row.operationNumber, daysAgo)
                ?.expectedOperationNumber === targetOperationNumber
        );
    });
    if (candidates.length === 0) return null;
    return candidates.sort(
        (a, b) =>
            dayjs(b.sightingTime).valueOf() - dayjs(a.sightingTime).valueOf(),
    )[0];
}
