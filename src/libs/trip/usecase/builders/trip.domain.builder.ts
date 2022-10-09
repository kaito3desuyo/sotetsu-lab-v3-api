import { Trip, Trips } from '../../domain/trip.domain';
import { CreateTripDto } from '../dtos/create-trip.dto';
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
};

export const TripsDomainBuilder = {
    buildFromCreateDto: (dtos: CreateTripDto[]): Trips => {
        return Trips.create(
            dtos.map((o) => TripDomainBuilder.buildFromCreateDto(o)),
        );
    },
} as const;
