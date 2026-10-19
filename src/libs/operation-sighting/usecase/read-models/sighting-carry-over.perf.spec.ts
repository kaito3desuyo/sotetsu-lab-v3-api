import dayjs from 'dayjs';
import { ItinerarySegment } from 'src/libs/operation/domain/itinerary-link-rule.domain';
import { VehicleItineraryReadModel } from 'src/libs/operation/usecase/read-models/vehicle-itinerary.read-model';
import { OperationSightingDetailsDto } from '../dtos/operation-sighting-details.dto';
import { SightingCarryOver } from './sighting-carry-over.read-model';

/**
 * 実データの規模（2026-10-05〜15: 1 日の目撃は最大 150 件、1 カレンダーの区間は最大 1865 個）で、
 * 割り当ての計算が重くならないことを見る。上限は手元の実測の 10 倍以上の余裕を取り、計算量の退行（2 乗・3 乗）だけを拾う
 */
describe('SightingCarryOver（実データの規模）', () => {
    // 行程 150 本 × 区間 12 個（運番は 3 区間ごとに替わる＝枠 4 つ）＝ 1800 区間
    const segments: ItinerarySegment[] = [];
    for (let v = 0; v < 150; v++) {
        for (let k = 0; k < 12; k++) {
            const id = `s${v}-${k}`;
            segments.push({
                id,
                tripId: id,
                tripBlockId: `b${v}-${k}`,
                operationId: `op${v}-${Math.floor(k / 3)}`,
                operationNumber: `${v}-${Math.floor(k / 3)}`,
                startStationId: 'X',
                endStationId: 'Y',
                startSeconds: 5 * 3600 + k * 5400,
                endSeconds: 5 * 3600 + k * 5400 + 5000,
                nextTripOperationListId: k < 11 ? `s${v}-${k + 1}` : null,
            });
        }
    }
    const itineraries = VehicleItineraryReadModel.create(segments);
    // 1 日 150 件: 編成 150 本がそれぞれ自分の行程の 1 つの枠で目撃される
    const sightings = Array.from({ length: 150 }, (_, i) => {
        const run = i % 4;
        const hour = 5 + run * 4.5 + 0.5;
        return {
            id: `x${i}`,
            operationSightingId: `x${i}`,
            operationId: `op${i}-${run}`,
            formationId: `f${i}`,
            sightingTime: dayjs('2026-10-12 00:00')
                .add(hour * 60, 'minute')
                .toDate(),
            operation: {
                operationId: `op${i}-${run}`,
                operationNumber: `${i}-${run}`,
            },
            formation: { formationId: `f${i}`, formationNumber: `F${i}` },
        } as unknown as OperationSightingDetailsDto;
    });
    const operations = Array.from({ length: 150 * 4 }, (_, i) => ({
        operationId: `op${Math.floor(i / 4)}-${i % 4}`,
        operationNumber: `${Math.floor(i / 4)}-${i % 4}`,
    }));

    it('過去の運用 11 日分（引き継ぎと並びのキー）が 3 秒以内', () => {
        const started = performance.now();
        for (let d = 0; d < 11; d++) {
            const day = [...sightings];
            const carry = SightingCarryOver.create(itineraries);
            const carried = carry.buildCarried({ sightings: day, operations });
            for (const o of [...day, ...carried])
                carry.orderOf(o, o.operation!.operationNumber, day);
            expect(carried.length).toBe(150 * 3);
        }
        const elapsed = performance.now() - started;
        expect(elapsed).toBeLessThan(3000);
    });

    it('real-time の一括取得（運番 600・編成 150）が 2 秒以内', () => {
        const started = performance.now();
        const day = [...sightings];
        const searchTime = dayjs('2026-10-12 14:00');
        const carry = SightingCarryOver.create(itineraries);
        for (const o of operations)
            carry.resolveForOperation({
                sightings: day,
                operationNumber: o.operationNumber,
                searchTime,
            });
        for (let i = 0; i < 150; i++)
            carry.resolveForFormation({
                sightings: day,
                formationNumber: `F${i}`,
                searchTime,
            });
        const elapsed = performance.now() - started;
        expect(elapsed).toBeLessThan(2000);
    });
});
