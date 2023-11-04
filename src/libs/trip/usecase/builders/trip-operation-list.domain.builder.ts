import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import {
    TripOperationList,
    TripOperationLists,
} from '../../domain/trip-operation-list.domain';
import { CreateTripOperationListDto } from '../dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../dtos/replace-trip-operation-list.dto';
import { TripOperationListDetailsDto } from '../dtos/trip-operation-list-details.dto';

export const TripOperationListDomainBuilder = {
    buildByDetailsDto: (
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
    buildByCreateDto: (dto: CreateTripOperationListDto): TripOperationList => {
        return TripOperationList.create({
            tripId: dto.tripId ?? '',
            operationId: dto.operationId,
            startStationId: dto.startStationId,
            endStationId: dto.endStationId,
            startTimeId: dto.startTimeId ?? '',
            endTimeId: dto.endTimeId ?? '',
        });
    },
    buildByReplaceDto: (
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
    buildByDetailsDto: (
        dtos: TripOperationListDetailsDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) =>
                TripOperationListDomainBuilder.buildByDetailsDto(o),
            ),
        );
    },
    buildByCreateDto: (
        dtos: CreateTripOperationListDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) => TripOperationListDomainBuilder.buildByCreateDto(o)),
        );
    },
    buildByReplaceDto: (
        dtos: ReplaceTripOperationListDto[],
    ): TripOperationLists => {
        return TripOperationLists.create(
            dtos.map((o) =>
                TripOperationListDomainBuilder.buildByReplaceDto(o),
            ),
        );
    },
} as const;
