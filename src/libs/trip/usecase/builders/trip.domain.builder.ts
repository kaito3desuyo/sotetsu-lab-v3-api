import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { Trip, Trips } from '../../domain/trip.domain';
import { CreateTripDto } from '../dtos/create-trip.dto';
import { ReplaceTripDto } from '../dtos/replace-trip.dto';
import { TimesDomainBuilder } from './time.domain.builder';
import { TripOperationListsDomainBulder } from './trip-operation-list.domain.builder';

export const TripDomainBuilder = {
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
            tripOperationLists: TripOperationListsDomainBulder.buildFromCreateDto(
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
                tripOperationLists: TripOperationListsDomainBulder.buildFromReplaceDto(
                    dto.tripOperationLists,
                ),
            },
            new UniqueEntityId(dto.id),
        );
    },
};

export const TripsDomainBuilder = {
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
