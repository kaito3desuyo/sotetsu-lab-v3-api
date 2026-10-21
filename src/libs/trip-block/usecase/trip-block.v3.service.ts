import { Injectable, NotFoundException } from '@nestjs/common';
import { secondsOfServiceDay } from '../../../core/utils/datetime.js';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { parseSparseFieldsets } from '../../../core/utils/sparse-fieldsets.js';
import { NextOperationPolicy } from '../../operation/domain/next-operation-policy.domain.js';
import { ItinerarySegmentQuery } from '../../operation/infrastructure/queries/itinerary-segment.query.js';
import { Trips } from '../../trip/domain/trip.domain.js';
import { TripBlock } from '../domain/trip-block.domain.js';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command.js';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query.js';
import {
    TripBlockDomainBuilder,
    TripBlocksDomainBuilder,
} from './builders/trip-block.domain.builder.js';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto.js';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto.js';
import { DeleteTripFromTripBlockDto } from './dtos/delete-trip-from-trip-block.dto.js';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto.js';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto.js';
import { TripBlockSparseDto } from './dtos/trip-block-sparse.dto.js';
import {
    TRIP_BLOCK_FIELDSET_REQUIRES,
    TRIP_BLOCK_FIELDSET_WHITELIST,
} from './trip-block-fieldsets.js';

interface TripLike {
    id?: string;
    calendarId: string | null;
    times?: {
        stationId: string;
        arrivalDays: number | null;
        arrivalTime: string | null;
        departureDays: number | null;
        departureTime: string | null;
    }[];
    tripOperationLists?: {
        id?: string;
        operationId: string;
        startStationId: string;
        endStationId: string;
        nextTripOperationListId?: string | null;
    }[];
}

/** 「次の運用」が 1 つでも設定されているか（null だけなら規則に触れない） */
function hasNextLink(
    trips: {
        tripOperationLists?: { nextTripOperationListId?: string | null }[];
    }[],
): boolean {
    return trips.some((t) =>
        (t.tripOperationLists ?? []).some((o) => !!o.nextTripOperationListId),
    );
}

@Injectable()
export class TripBlockV3Service {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
        private readonly itinerarySegmentQuery: ItinerarySegmentQuery,
    ) {}

    /**
     * 書き込む区間の「次の運用」を、そのダイヤの区間と突き合わせて検める。
     * 決まり 1 の判定は、送られた区間（運番・駅・時刻・列車のまとまり）で組み直す。
     * blockKeys は trips と同じ並びで、各列車が属するまとまりの id（新しいまとまりは仮の名前）
     */
    async #validateNextSegments(
        trips: TripLike[],
        blockKeys: string[],
        removedIds: string[] = [],
    ): Promise<void> {
        if (!hasNextLink(trips)) return;
        const byCalendar = new Map<
            string,
            { trip: TripLike; block: string }[]
        >();
        trips.forEach((trip, i) => {
            const lists = trip.tripOperationLists ?? [];
            if (!trip.calendarId) {
                if (lists.some((o) => o.nextTripOperationListId)) {
                    throw new UseCaseError(
                        'ダイヤのない列車には次の運用を設定できません',
                        { reason: 'next_segment_without_calendar' },
                    );
                }
                return;
            }
            byCalendar.set(trip.calendarId, [
                ...(byCalendar.get(trip.calendarId) ?? []),
                { trip, block: blockKeys[i] },
            ]);
        });
        for (const [calendarId, items] of byCalendar) {
            const existing =
                await this.itinerarySegmentQuery.findManyByCalendarId({
                    calendarId,
                });
            const operationNumbers = new Map(
                existing.map((o) => [o.operationId, o.operationNumber]),
            );
            NextOperationPolicy.validate({
                segments: existing,
                removedIds,
                proposed: items.flatMap(({ trip, block }) =>
                    (trip.tripOperationLists ?? []).map((o) => {
                        const departure = trip.times?.find(
                            (x) => x.stationId === o.startStationId,
                        );
                        const arrival = trip.times?.find(
                            (x) => x.stationId === o.endStationId,
                        );
                        const startSeconds = secondsOfServiceDay(
                            departure?.departureDays ?? null,
                            departure?.departureTime ?? null,
                        );
                        const endSeconds = secondsOfServiceDay(
                            arrival?.arrivalDays ?? null,
                            arrival?.arrivalTime ?? null,
                        );
                        return {
                            id: o.id,
                            nextTripOperationListId: o.nextTripOperationListId,
                            segment:
                                o.operationId &&
                                startSeconds !== null &&
                                endSeconds !== null
                                    ? {
                                          tripId: trip.id ?? block,
                                          tripBlockId: block,
                                          operationId: o.operationId,
                                          operationNumber:
                                              operationNumbers.get(
                                                  o.operationId,
                                              ) ?? o.operationId,
                                          startStationId: o.startStationId,
                                          endStationId: o.endStationId,
                                          startSeconds,
                                          endSeconds,
                                      }
                                    : undefined,
                        };
                    }),
                ),
            });
        }
    }

    /**
     * `fields` が無ければ全項目、あれば許可リストで検めて指定の項目だけを返す
     * （docs/adr/0002-v3-sparse-fieldsets.md）。
     */
    async findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        fields?: unknown;
    }): Promise<TripBlockDetailsDto[] | TripBlockSparseDto[]> {
        const { calendarId, tripDirection, fields } = params;
        const fieldsets = parseSparseFieldsets(
            fields,
            TRIP_BLOCK_FIELDSET_WHITELIST,
            TRIP_BLOCK_FIELDSET_REQUIRES,
        );
        if (!fieldsets) {
            return this.tripBlockQuery.findManyByFilter({
                calendarId,
                tripDirection,
            });
        }
        return this.tripBlockQuery.findManyByFilterWithFields(
            { calendarId, tripDirection },
            fieldsets,
        );
    }

    findOneById(params: { id: string }): Promise<TripBlockDetailsDto | null> {
        return this.tripBlockQuery.findOneById(params);
    }

    async createManyTripBlocks(
        dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        await this.#validateNextSegments(
            dtos.flatMap((o) => o.trips),
            dtos.flatMap((o, i) => o.trips.map(() => `new-block-${i}`)),
        );
        const domains = TripBlocksDomainBuilder.buildFromCreateDto(dtos);
        return this.tripBlockCommand.bulkCreate(domains);
    }

    async replaceOneTripBlock(params: {
        id: string;
        dto: ReplaceTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const current = hasNextLink(dto.trips)
            ? await this.tripBlockQuery.findOneTripBlockByTripBlockId(id)
            : null;
        const sentIds = new Set(
            dto.trips.flatMap((t) =>
                (t.tripOperationLists ?? []).map((o) => o.id),
            ),
        );
        const removedIds = (current?.trips ?? [])
            .flatMap((t) => t.tripOperationLists ?? [])
            .map((o) => o.id)
            .filter((x) => !sentIds.has(x));
        await this.#validateNextSegments(
            dto.trips,
            dto.trips.map(() => id),
            removedIds,
        );
        const domain = TripBlockDomainBuilder.buildFromReplaceDto({
            ...dto,
            id,
        });
        return this.tripBlockCommand.replaceOneTripBlockByDomain(domain);
    }

    async addTripToTripBlock(params: {
        id: string;
        dto: AddTripToTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto = {
            from: await this.tripBlockQuery.findOneTripBlockByTripId(
                dto.tripId,
            ),
            to: await this.tripBlockQuery.findOneTripBlockByTripBlockId(id),
        };

        if (!tripBlockDto.from || !tripBlockDto.to) {
            throw new NotFoundException('Either TripBlock is not found.');
        }

        const tripBlock = {
            from: TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto.from),
            to: TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto.to),
        };

        const trip = tripBlock.from.getTripByTripId(dto.tripId);

        tripBlock.from.removeTrip(trip);
        tripBlock.to.addTrip(trip);

        await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock.to);

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.from.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(
                tripBlock.from,
            );
        }

        return result;
    }

    async deleteTripFromTripBlock(params: {
        id: string;
        dto: DeleteTripFromTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto =
            await this.tripBlockQuery.findOneTripBlockByTripBlockId(id);

        if (!tripBlockDto) {
            throw new NotFoundException('TripBlock is not found.');
        }

        const tripBlock =
            TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto);

        const trip = tripBlock.getTripByTripId(dto.tripId);

        if (!trip) {
            throw new NotFoundException('Trip is not include this TripBlock.');
        }

        tripBlock.removeTrip(trip);

        const replaceSpecifiedTripBlock = async () => {
            await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock);
        };

        const replaceAsAnotherTripBlock = async () => {
            const emptyTripBlock = TripBlock.create({
                trips: Trips.create([]),
            });

            emptyTripBlock.addTrip(trip);

            await this.tripBlockCommand.replaceOneTripBlockByDomain(
                emptyTripBlock,
            );
        };

        if (dto.holdAsAnotherTripBlock) {
            await replaceAsAnotherTripBlock();
        } else {
            await replaceSpecifiedTripBlock();
        }

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(tripBlock);
        }

        return result;
    }
}
