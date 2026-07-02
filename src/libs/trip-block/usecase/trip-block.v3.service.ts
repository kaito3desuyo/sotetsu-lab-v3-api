import { Injectable, NotFoundException } from '@nestjs/common';
import { Trips } from 'src/libs/trip/domain/trip.domain';
import { TripBlock } from '../domain/trip-block.domain';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import {
    TripBlockDomainBuilder,
    TripBlocksDomainBuilder,
} from './builders/trip-block.domain.builder';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from './dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable()
export class TripBlockV3Service {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
    ) {}

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
    }): Promise<TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findManyByFilter(params);
    }

    findOneById(params: { id: string }): Promise<TripBlockDetailsDto | null> {
        return this.tripBlockQuery.findOneById(params);
    }

    async createManyTripBlocks(
        dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const domains = TripBlocksDomainBuilder.buildFromCreateDto(dtos);
        return this.tripBlockCommand.bulkCreate(domains);
    }

    async replaceOneTripBlock(params: {
        id: string;
        dto: ReplaceTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const domain = TripBlockDomainBuilder.buildFromReplaceDto({
            ...dto,
            id,
        });
        return this.tripBlockCommand.replaceOneTripBlockByDomain(domain);
    }

    async addTripToTripBlock(params: {
        id: string;
        dto: AddTripToTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto = {
            from: await this.tripBlockQuery.findOneTripBlockByTripId(
                dto.tripId,
            ),
            to: await this.tripBlockQuery.findOneTripBlockByTripBlockId(id),
        };

        if (!tripBlockDto.from || !tripBlockDto.to) {
            throw new NotFoundException('Either TripBlock is not found.');
        }

        const tripBlock = {
            from: TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto.from),
            to: TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto.to),
        };

        const trip = tripBlock.from.getTripByTripId(dto.tripId);

        tripBlock.from.removeTrip(trip);
        tripBlock.to.addTrip(trip);

        await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock.to);

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.from.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(
                tripBlock.from,
            );
        }

        return result;
    }

    async deleteTripFromTripBlock(params: {
        id: string;
        dto: DeleteTripFromTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto =
            await this.tripBlockQuery.findOneTripBlockByTripBlockId(id);

        if (!tripBlockDto) {
            throw new NotFoundException('TripBlock is not found.');
        }

        const tripBlock =
            TripBlockDomainBuilder.buildFromDetailsDto(tripBlockDto);

        const trip = tripBlock.getTripByTripId(dto.tripId);

        if (!trip) {
            throw new NotFoundException('Trip is not include this TripBlock.');
        }

        tripBlock.removeTrip(trip);

        const replaceSpecifiedTripBlock = async () => {
            await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock);
        };

        const replaceAsAnotherTripBlock = async () => {
            const emptyTripBlock = TripBlock.create({
                trips: Trips.create([]),
            });

            emptyTripBlock.addTrip(trip);

            await this.tripBlockCommand.replaceOneTripBlockByDomain(
                emptyTripBlock,
            );
        };

        if (dto.holdAsAnotherTripBlock) {
            await replaceAsAnotherTripBlock();
        } else {
            await replaceSpecifiedTripBlock();
        }

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(tripBlock);
        }

        return result;
    }
}
