import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain';
import { CreateTripOperationListDto } from '../dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../dtos/replace-trip-operation-list.dto';

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
    buildFromReplaceDto: (
        dto: ReplaceTripOperationListDto,
    ): TripOperationList => {
        return TripOperationList.create(
            {
                tripId: dto.tripId ?? '',
                operationId: dto.operationId,
                startStationId: dto.startStationId,
                endStationId: dto.endStationId,
                startTimeId: dto.startTimeId ?? '',
                endTimeId: dto.endTimeId ?? '',
            },
            new UniqueEntityId(dto.id),
        );
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
    buildFromReplaceDto: (
        dtos: ReplaceTripOperationListDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) =>
                TripOperationListDomainBuilder.buildFromReplaceDto(o),
            ),
        );
    },
} as const;
