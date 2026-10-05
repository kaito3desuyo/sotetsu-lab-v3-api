import { OperationGroupDto } from './dtos/operation-group.dto';

/**
 * 運用番号の循環経路（circulation）に関する純粋な算出ロジック。
 * operation-sighting ドメインの群判定・最新目撃キャッシュ探索と
 * operations/groups エンドポイントの両方から参照される単一情報源。
 */
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

/**
 * 運用番号の先頭数字 + 末尾の英字接尾辞（G/K 等）から群名を導出する。
 * 例: '11' → '1群', '70' → '7群', '91G' → '9G群'
 */
function getGroupName(operationNumber: string): string {
    const match = operationNumber.match(/^(\d)\d*([A-Za-z]*)$/);
    if (!match) return `${operationNumber}群`;
    const [, leadDigit, suffix] = match;
    return `${leadDigit}${suffix}群`;
}

/**
 * operationNumberCirculateMap は循環（サイクル）の集合として定義されている。
 * 連結成分（＝群）ごとに運用番号を列挙し、群名と併せて返す。
 * calendar には依存しない（circulation map 自体がダイヤに関わらず固定のため）。
 */
export function getOperationGroups(
    map: Map<string, string> = operationNumberCirculateMap,
): OperationGroupDto[] {
    const visited = new Set<string>();
    const groups: OperationGroupDto[] = [];

    for (const start of map.keys()) {
        if (visited.has(start)) continue;
        const operationNumbers = getGroupMembers(start, map, map.size);
        operationNumbers.forEach((member) => visited.add(member));
        groups.push({
            groupName: getGroupName(start),
            operationNumbers,
        });
    }

    return groups;
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
