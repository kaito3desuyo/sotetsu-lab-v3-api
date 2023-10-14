import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { TripsDomainBuilder } from 'src/libs/trip/usecase/builders/trip.domain.builder';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { CreateTripBlockDto } from '../dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../dtos/trip-block-details.dto';

export const TripBlockDomainBuilder = {
    buildByDetailsDto: (dto: TripBlockDetailsDto) => {
        return TripBlock.create(
            {
                trips: TripsDomainBuilder.buildByDetailsDto(dto.trips),
            },
            new UniqueEntityId(dto.id),
        );
    },
    buildByCreateDto: (dto: CreateTripBlockDto) => {
        return TripBlock.create({
            trips: TripsDomainBuilder.buildByCreateDto(dto.trips),
        });
    },
    buildByReplaceDto: (dto: ReplaceTripBlockDto) => {
        return TripBlock.create(
            {
                trips: TripsDomainBuilder.buildByReplaceDto(dto.trips),
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TripBlocksDomainBuilder = {
    buildByDetailsDto: (dtos: TripBlockDetailsDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByDetailsDto(o)),
        );
    },
    buildByCreateDto: (dtos: CreateTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByCreateDto(o)),
        );
    },
    buildByReplaceDto: (dtos: ReplaceTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByReplaceDto(o)),
        );
    },
} as const;
