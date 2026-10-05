import dayjs from 'dayjs';
import { getBaseDate } from 'src/core/utils/datetime';
import { buildCirculationPath } from 'src/libs/operation/usecase/operation-number-circulation';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto';

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
