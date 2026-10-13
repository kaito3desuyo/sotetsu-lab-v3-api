import { ItineraryLink, ItinerarySegment } from 'src/libs/operation/domain/itinerary-link-rule.domain';
import { VehicleItineraryReadModel } from 'src/libs/operation/usecase/read-models/vehicle-itinerary.read-model';
import { NextSegmentCandidateDto } from './dtos/next-segment-candidate.dto';
import {
    ItineraryLinkEndDto,
    OperationItineraryLinkDto,
} from './dtos/operation-itinerary-link.dto';

const end = (link: ItineraryLink, stationId: string): ItineraryLinkEndDto => ({
    tripOperationListId: link.segment.id,
    tripId: link.segment.tripId,
    operationId: link.segment.operationId,
    operationNumber: link.segment.operationNumber,
    stationId,
    rule: link.rule,
});

/** 運番が変わるつながりを区間ごとに返す（運用表・行路図の「← 11K から」「→ 12K へ」用） */
export function buildOperationItineraryLinks(
    itineraries: VehicleItineraryReadModel,
): OperationItineraryLinkDto[] {
    const out: OperationItineraryLinkDto[] = [];
    for (const s of itineraries.segments()) {
        const { previous: prev, next } = itineraries.linksOf(s.id);
        const previous =
            prev && prev.segment.operationNumber !== s.operationNumber
                ? end(prev, prev.segment.endStationId)
                : null;
        const nextEnd =
            next && next.segment.operationNumber !== s.operationNumber
                ? end(next, next.segment.startStationId)
                : null;
        if (!previous && !nextEnd) continue;
        out.push({
            tripOperationListId: s.id,
            tripId: s.tripId,
            operationId: s.operationId,
            previous,
            next: nextEnd,
        });
    }
    return out;
}

/** 「次の運用」の候補。その駅でそのあと始まる区間を時刻順に（spec 3.6 決まり 2・5.3） */
export function buildNextSegmentCandidates(
    segments: ItinerarySegment[],
    params: { stationId: string; afterSeconds: number },
): NextSegmentCandidateDto[] {
    const taken = new Set(
        segments
            .map((o) => o.nextTripOperationListId)
            .filter((o): o is string => !!o),
    );
    // 決まり 1（列車の途中の運番替わり）で行き元が決まっている区間は、次の運用に選んでも効かない
    const rule1 = VehicleItineraryReadModel.create(
        segments.map((o) => ({ ...o, nextTripOperationListId: null })),
    );
    return segments
        .filter(
            (o) =>
                o.startStationId === params.stationId &&
                o.startSeconds >= params.afterSeconds,
        )
        .sort((a, b) => a.startSeconds - b.startSeconds)
        .slice(0, 20)
        .map((o) => ({
            tripOperationListId: o.id,
            tripId: o.tripId,
            operationId: o.operationId,
            operationNumber: o.operationNumber,
            startStationId: o.startStationId,
            startSeconds: o.startSeconds,
            isFixedByTripBlock: rule1.linksOf(o.id).previous?.rule === 1,
            isTaken:
                taken.has(o.id) || rule1.linksOf(o.id).previous?.rule === 1,
        }));
}
