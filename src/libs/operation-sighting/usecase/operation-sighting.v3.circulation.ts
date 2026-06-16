import dayjs from 'dayjs';
import { getBaseDate } from 'src/core/utils/datetime';
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

export function buildCirculationPath(
    startOperationNumber: string,
    steps: number,
): { path: string[]; expectedOperationNumber: string } | null {
    const path: string[] = [];
    let current = startOperationNumber;
    for (let i = 0; i < steps; i++) {
        const next = operationNumberCirculateMap.get(current);
        if (!next) return null;
        current = next;
        path.push(current);
    }
    return { path, expectedOperationNumber: current };
}

export function getGroupMembers(
    start: string,
    map: Map<string, string>,
    maxSteps = 9,
): string[] {
    const members = new Set<string>([start]);
    let current = start;
    for (let i = 0; i < maxSteps; i++) {
        const next = map.get(current);
        if (!next || next === start) break;
        members.add(next);
        current = next;
    }
    return [...members];
}

export const operationNumberCirculateMap = new Map([
    // 1群
    ['11', '12'],
    ['12', '13'],
    ['13', '14'],
    ['14', '15'],
    ['15', '16'],
    ['16', '11'],
    // 5群
    ['51', '52'],
    ['52', '53'],
    ['53', '54'],
    ['54', '55'],
    ['55', '56'],
    ['56', '57'],
    ['57', '58'],
    ['58', '59'],
    ['59', '51'],
    // 6群
    ['61', '62'],
    ['62', '63'],
    ['63', '64'],
    ['64', '65'],
    ['65', '66'],
    ['66', '67'],
    ['67', '68'],
    ['68', '69'],
    ['69', '61'],
    // 7群
    ['70', '71'],
    ['71', '72'],
    ['72', '73'],
    ['73', '70'],
    // 9G群
    ['91G', '92G'],
    ['92G', '93G'],
    ['93G', '94G'],
    ['94G', '95G'],
    ['95G', '91G'],
]);

export const operationNumberCirculateReverseMap = new Map([
    ...Array.from(operationNumberCirculateMap.entries()).map(
        (arr) => arr.reverse() as [string, string],
    ),
]);
