import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { Trip, Trips } from '../../domain/trip.domain';
import { CreateTripDto } from '../dtos/create-trip.dto';
import { ReplaceTripDto } from '../dtos/replace-trip.dto';
import { TimesDomainBuilder } from './time.domain.builder';
import { TripOperationListsDomainBulder } from './trip-operation-list.domain.builder';
import { TripDetailsDto } from '../dtos/trip-details.dto';

export const TripDomainBuilder = {
    buildByDetailsDto: (dto: TripDetailsDto): Trip => {
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
                times: TimesDomainBuilder.buildByDetailsDto(dto.times),
                tripOperationLists: TripOperationListsDomainBulder.buildByDetailsDto(
                    dto.tripOperationLists,
                ),
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildByCreateDto: (dto: CreateTripDto): Trip => {
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
            times: TimesDomainBuilder.buildByCreateDto(dto.times),
            tripOperationLists: TripOperationListsDomainBulder.buildByCreateDto(
                dto.tripOperationLists,
            ),
        });
    },
    buildByReplaceDto: (dto: ReplaceTripDto): Trip => {
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
                times: TimesDomainBuilder.buildByReplaceDto(dto.times),
                tripOperationLists: TripOperationListsDomainBulder.buildByReplaceDto(
                    dto.tripOperationLists,
                ),
            },
            new UniqueEntityId(dto.id),
        );
    },
};

export const TripsDomainBuilder = {
    buildByDetailsDto: (dtos: TripDetailsDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildByDetailsDto(o)),
        );
    },
    buildByCreateDto: (dtos: CreateTripDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildByCreateDto(o)),
        );
    },
    buildByReplaceDto: (dtos: ReplaceTripDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildByReplaceDto(o)),
        );
    },
} as const;
