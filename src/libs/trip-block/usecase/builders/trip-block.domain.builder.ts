import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { TripsDomainBuilder } from 'src/libs/trip/usecase/builders/trip.domain.builder';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { CreateTripBlockDto } from '../dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../dtos/trip-block-details.dto';

export const TripBlockDomainBuilder = {
    buildFromDetailsDto: (dto: TripBlockDetailsDto) => {
        return TripBlock.create(
            {
                trips: TripsDomainBuilder.buildFromDetailsDto(dto.trips),
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildFromCreateDto: (dto: CreateTripBlockDto) => {
        return TripBlock.create({
            trips: TripsDomainBuilder.buildFromCreateDto(dto.trips),
        });
    },
    buildFromReplaceDto: (dto: ReplaceTripBlockDto) => {
        return TripBlock.create(
            {
                trips: TripsDomainBuilder.buildFromReplaceDto(dto.trips),
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TripBlocksDomainBuilder = {
    buildFromDetailsDto: (dtos: TripBlockDetailsDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildFromDetailsDto(o)),
        );
    },
    buildFromCreateDto: (dtos: CreateTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildFromCreateDto(o)),
        );
    },
    buildFromReplaceDto: (dtos: ReplaceTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildFromReplaceDto(o)),
        );
    },
} as const;
