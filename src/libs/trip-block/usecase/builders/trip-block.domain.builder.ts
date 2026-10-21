import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import { TripsDomainBuilder } from '../../../trip/usecase/builders/trip.domain.builder.js';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain.js';
import { CreateTripBlockDto } from '../dtos/create-trip-block.dto.js';
import { ReplaceTripBlockDto } from '../dtos/replace-trip-block.dto.js';
import { TripBlockDetailsDto } from '../dtos/trip-block-details.dto.js';

export const TripBlockDomainBuilder = {
    buildFromDetailsDto: (dto: TripBlockDetailsDto) => {
        if (!dto.trips) {
            throw new UnexpectedError('block の列車が結合されていない', {
                tripBlockId: dto.id,
            });
        }
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
