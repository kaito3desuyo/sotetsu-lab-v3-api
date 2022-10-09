import { TripsDomainBuilder } from 'src/libs/trip/usecase/builders/trip.domain.builder';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { CreateTripBlockDto } from '../dtos/create-trip-block.dto';

export const TripBlockDomainBuilder = {
    buildByCreateDto: (dto: CreateTripBlockDto) => {
        return TripBlock.create({
            trips: TripsDomainBuilder.buildFromCreateDto(dto.trips),
        });
    },
} as const;

export const TripBlocksDomainBuilder = {
    buildFromCreateDto: (dtos: CreateTripBlockDto[]): TripBlocks => {
        return TripBlocks.create(
            dtos.map((o) => TripBlockDomainBuilder.buildByCreateDto(o)),
        );
    },
} as const;
