import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { TripsDomainBuilder } from 'src/libs/trip/usecase/builders/trip.domain.builder';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { CreateTripBlockDto } from '../dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../dtos/replace-trip-block.dto';

export const TripBlockDomainBuilder = {
    buildByCreateDto: (dto: CreateTripBlockDto) => {
        return TripBlock.create({
            trips: TripsDomainBuilder.buildFromCreateDto(dto.trips),
        });
    },
    buildByReplaceDto: (dto: ReplaceTripBlockDto) => {
        return TripBlock.create(
            {
                trips: TripsDomainBuilder.buildFromReplaceDto(dto.trips),
            },
            new UniqueEntityId(dto.id),
        );
    },
} as const;

export const TripBlocksDomainBuilder = {
    buildFromCreateDto: (dtos: CreateTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByCreateDto(o)),
        );
    },
    buildFromReplaceDto: (dtos: ReplaceTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByReplaceDto(o)),
        );
    },
} as const;
