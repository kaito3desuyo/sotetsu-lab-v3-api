import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import { Trip, Trips } from '../../domain/trip.domain.js';
import { CreateTripDto } from '../dtos/create-trip.dto.js';
import { ReplaceTripDto } from '../dtos/replace-trip.dto.js';
import { TimesDomainBuilder } from './time.domain.builder.js';
import { TripOperationListsDomainBuilder } from './trip-operation-list.domain.builder.js';
import { TripDetailsDto } from '../dtos/trip-details.dto.js';

export const TripDomainBuilder = {
    buildFromDetailsDto: (dto: TripDetailsDto): Trip => {
        if (!dto.times || !dto.tripOperationLists) {
            throw new UnexpectedError(
                '列車の時刻か運用のつながりが結合されていない',
                { tripId: dto.id },
            );
        }
        return Trip.create(
            {
                serviceId: dto.serviceId,
                tripNumber: dto.tripNumber,
                tripClassId: dto.tripClassId,
                tripName: dto.tripName,
                tripDirection: dto.tripDirection,
                tripBlockId: dto.tripBlockId,
                depotIn: dto.depotIn,
                depotOut: dto.depotOut,
                calendarId: dto.calendarId,
                extraCalendarId: dto.extraCalendarId,
                times: TimesDomainBuilder.buildFromDetailsDto(dto.times),
                tripOperationLists: TripOperationListsDomainBuilder.buildFromDetailsDto(
                    dto.tripOperationLists,
                ),
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildFromCreateDto: (dto: CreateTripDto): Trip => {
        return Trip.create({
            serviceId: dto.serviceId,
            tripNumber: dto.tripNumber,
            tripClassId: dto.tripClassId,
            tripName: dto.tripName,
            tripDirection: dto.tripDirection,
            tripBlockId: dto.tripBlockId ?? '',
            depotIn: dto.depotIn,
            depotOut: dto.depotOut,
            calendarId: dto.calendarId,
            extraCalendarId: dto.extraCalendarId,
            times: TimesDomainBuilder.buildFromCreateDto(dto.times),
            tripOperationLists: TripOperationListsDomainBuilder.buildFromCreateDto(
                dto.tripOperationLists,
            ),
        });
    },
    buildFromReplaceDto: (dto: ReplaceTripDto): Trip => {
        return Trip.create(
            {
                serviceId: dto.serviceId,
                tripNumber: dto.tripNumber,
                tripClassId: dto.tripClassId,
                tripName: dto.tripName,
                tripDirection: dto.tripDirection,
                tripBlockId: dto.tripBlockId ?? '',
                depotIn: dto.depotIn,
                depotOut: dto.depotOut,
                calendarId: dto.calendarId,
                extraCalendarId: dto.extraCalendarId,
                times: TimesDomainBuilder.buildFromReplaceDto(dto.times),
                tripOperationLists: TripOperationListsDomainBuilder.buildFromReplaceDto(
                    dto.tripOperationLists,
                ),
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TripsDomainBuilder = {
    buildFromDetailsDto: (dtos: TripDetailsDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildFromDetailsDto(o)),
        );
    },
    buildFromCreateDto: (dtos: CreateTripDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildFromCreateDto(o)),
        );
    },
    buildFromReplaceDto: (dtos: ReplaceTripDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildFromReplaceDto(o)),
        );
    },
} as const;
