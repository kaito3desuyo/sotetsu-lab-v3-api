import { ItinerarySegment } from '../domain/itinerary-link-rule.domain.js';
import { VehicleItineraryReadModel } from './read-models/vehicle-itinerary.read-model.js';
import {
    buildNextSegmentCandidates,
    buildOperationItineraryLinks,
} from './build-operation-itinerary-links.js';

const seg = (
    p: Partial<ItinerarySegment> &
        Pick<ItinerarySegment, 'id' | 'operationNumber'>,
): ItinerarySegment => ({
    tripId: p.id,
    tripBlockId: p.id,
    operationId: `op-${p.operationNumber}`,
    startStationId: 'X',
    endStationId: 'Y',
    startSeconds: 0,
    endSeconds: 0,
    nextTripOperationListId: null,
    ...p,
});

describe('buildOperationItineraryLinks', () => {
    const a = seg({
        id: 'a',
        operationNumber: '11K',
        endStationId: 'ebina',
        startSeconds: 100,
        endSeconds: 200,
        nextTripOperationListId: 'b',
    });
    const b = seg({
        id: 'b',
        operationNumber: '12K',
        startStationId: 'ebina',
        startSeconds: 300,
        endSeconds: 400,
    });
    const c = seg({
        id: 'c',
        operationNumber: '12K',
        startSeconds: 500,
        endSeconds: 600,
    });

    it('運番が変わるところだけ前後を返す', () => {
        const links = buildOperationItineraryLinks(
            VehicleItineraryReadModel.create([a, b, c]),
        );
        expect(links).toEqual([
            {
                tripOperationListId: 'a',
                tripId: 'a',
                operationId: 'op-11K',
                previous: null,
                next: {
                    tripOperationListId: 'b',
                    tripId: 'b',
                    operationId: 'op-12K',
                    operationNumber: '12K',
                    stationId: 'ebina',
                    rule: 2,
                },
            },
            {
                tripOperationListId: 'b',
                tripId: 'b',
                operationId: 'op-12K',
                next: null,
                previous: {
                    tripOperationListId: 'a',
                    tripId: 'a',
                    operationId: 'op-11K',
                    operationNumber: '11K',
                    stationId: 'ebina',
                    rule: 2,
                },
            },
        ]);
    });

    it('候補: その駅でそのあと始まる区間を時刻順に、指されているかを付けて返す', () => {
        const d = seg({
            id: 'd',
            operationNumber: '38G',
            startStationId: 'ebina',
            startSeconds: 250,
            endSeconds: 900,
        });
        const early = seg({
            id: 'e',
            operationNumber: '01K',
            startStationId: 'ebina',
            startSeconds: 50,
            endSeconds: 90,
        });
        const out = buildNextSegmentCandidates([a, b, c, d, early], {
            stationId: 'ebina',
            afterSeconds: 200,
        });
        expect(out.map((o) => [o.tripOperationListId, o.isTaken])).toEqual([
            ['d', false],
            ['b', true],
        ]);
    });

    it('候補: 決まり 1 で行き元が決まっている区間は isTaken（isFixedByTripBlock も true）', () => {
        const x = seg({
            id: 'x',
            tripBlockId: 'blk',
            operationNumber: '18K',
            endStationId: 'ak',
            startSeconds: 0,
            endSeconds: 100,
        });
        const y = seg({
            id: 'y',
            tripBlockId: 'blk',
            operationNumber: '02K',
            startStationId: 'ak',
            startSeconds: 100,
            endSeconds: 200,
        });
        const out = buildNextSegmentCandidates([x, y], {
            stationId: 'ak',
            afterSeconds: 0,
        });
        expect(
            out.map((o) => [
                o.tripOperationListId,
                o.isTaken,
                o.isFixedByTripBlock,
            ]),
        ).toEqual([['y', true, true]]);
    });
});
