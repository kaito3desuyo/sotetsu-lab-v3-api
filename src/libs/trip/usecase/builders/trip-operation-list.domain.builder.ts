import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain';
import { CreateTripOperationListDto } from '../dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../dtos/replace-trip-operation-list.dto';
import { TripOperationListDetailsDto } from '../dtos/trip-operation-list-details.dto';

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
