import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { Trip, Trips } from '../../domain/trip.domain';
import { CreateTripDto } from '../dtos/create-trip.dto';
import { ReplaceTripDto } from '../dtos/replace-trip.dto';
import { TimesDomainBuilder } from './time.domain.builder';
import { TripOperationListsDomainBuilder } from './trip-operation-list.domain.builder';
import { TripDetailsDto } from '../dtos/trip-details.dto';

export const TripDomainBuilder = {
    buildFromDetailsDto: (dto: TripDetailsDto): Trip => {
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
