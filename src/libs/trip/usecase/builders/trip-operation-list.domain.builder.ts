import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain.js';
import { CreateTripOperationListDto } from '../dtos/create-trip-operation-list.dto.js';
import { ReplaceTripOperationListDto } from '../dtos/replace-trip-operation-list.dto.js';
import { TripOperationListDetailsDto } from '../dtos/trip-operation-list-details.dto.js';

export const TripOperationListDomainBuilder = {
    buildFromDetailsDto: (
        dto: TripOperationListDetailsDto,
    ): TripOperationList => {
        return TripOperationList.create(
            {
                tripId: dto.tripId,
                operationId: dto.operationId,
                startStationId: dto.startStationId,
                endStationId: dto.endStationId,
                startTimeId: dto.startTimeId,
                endTimeId: dto.endTimeId,
                nextTripOperationListId: dto.nextTripOperationListId,
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildFromCreateDto: (dto: CreateTripOperationListDto): TripOperationList => {
        return TripOperationList.create({
            tripId: dto.tripId ?? '',
            operationId: dto.operationId,
            startStationId: dto.startStationId,
            endStationId: dto.endStationId,
            startTimeId: dto.startTimeId ?? '',
            endTimeId: dto.endTimeId ?? '',
            nextTripOperationListId: dto.nextTripOperationListId,
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
                nextTripOperationListId: dto.nextTripOperationListId,
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TripOperationListsDomainBuilder = {
    buildFromDetailsDto: (
        dtos: TripOperationListDetailsDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) =>
                TripOperationListDomainBuilder.buildFromDetailsDto(o),
            ),
        );
    },
    buildFromCreateDto: (
        dtos: CreateTripOperationListDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) => TripOperationListDomainBuilder.buildFromCreateDto(o)),
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
