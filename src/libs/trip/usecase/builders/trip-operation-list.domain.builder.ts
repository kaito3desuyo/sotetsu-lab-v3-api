import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain';
import { CreateTripOperationListDto } from '../dtos/create-trip-operation-list.dto';

export const TripOperationListDomainBuilder = {
    buildFromCreateDto: (
        dto: CreateTripOperationListDto,
    ): TripOperationList => {
        return TripOperationList.create({
            tripId: dto.tripId ?? '',
            operationId: dto.operationId,
            startStationId: dto.startStationId,
            endStationId: dto.endStationId,
            startTimeId: dto.startTimeId ?? '',
            endTimeId: dto.endTimeId ?? '',
        });
    },
} as const;

export const TripOperationListsDomainBulder = {
    buildFromCreateDto: (
        dtos: CreateTripOperationListDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) =>
                TripOperationListDomainBuilder.buildFromCreateDto(o),
            ),
        );
    },
} as const;
