import { Injectable, NotFoundException } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { Trips } from 'src/libs/trip/domain/trip.domain';
import { TripBlock, TripBlocks } from '../domain/trip-block.domain';
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
export class TripBlockV2Service {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
    ) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        TripBlockDetailsDto[] | GetManyDefaultResponse<TripBlockDetailsDto>
    > {
        return this.tripBlockQuery.findManyTripBlocks(query);
    }

    async createManyTripBlocks(
        query: CrudRequest,
        dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const domains = TripBlocksDomainBuilder.buildByCreateDto(dtos);
        const result = await this.tripBlockCommand.createManyTripBlocks(
            query,
            domains,
        );
        return result;
    }

    async replaceOneTripBlock(
        query: CrudRequest,
        dto: ReplaceTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const domain = TripBlockDomainBuilder.buildByReplaceDto(dto);
        const result = await this.tripBlockCommand.replaceOneTripBlock(
            query,
            domain,
        );
        return result;
    }

    async addTripToTripBlock(
        query: CrudRequest,
        dto: AddTripToTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const tripBlockDto = {
            from: await this.tripBlockQuery.findOneTripBlockByTripId(
                dto.tripId,
            ),
            to: await this.tripBlockQuery.findOneTripBlockByTripBlockId(dto.id),
        };

        if (!tripBlockDto.from || !tripBlockDto.to) {
            throw new NotFoundException('Either TripBlock is not found.');
        }

        const tripBlock = {
            from: TripBlockDomainBuilder.buildByDetailsDto(tripBlockDto.from),
            to: TripBlockDomainBuilder.buildByDetailsDto(tripBlockDto.to),
        };

        const trip = {
            from: tripBlock.from.props.trips.getItemByFn((trip) =>
                trip.id.isEqual(new UniqueEntityId(dto.tripId)),
            ),
        };

        tripBlock.from.props.trips.remove(trip.from);
        tripBlock.to.props.trips.add(trip.from);

        const result = await this.tripBlockCommand.replaceOneTripBlock(
            query,
            tripBlock.to,
        );

        if (tripBlock.from.props.trips.isEmpty()) {
            const tripBlocks = TripBlocks.create([tripBlock.from]);
            await this.tripBlockCommand.deleteManyTripBlockByDomain(tripBlocks);
        }

        return result;
    }

    async deleteTripFromTripBlock(
        query: CrudRequest,
        dto: DeleteTripFromTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const tripBlockDto = await this.tripBlockQuery.findOneTripBlockByTripBlockId(
            dto.id,
        );

        if (!tripBlockDto) {
            throw new NotFoundException('TripBlock is not found.');
        }

        const tripBlock = TripBlockDomainBuilder.buildByDetailsDto(
            tripBlockDto,
        );

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

        const result = await this.tripBlockQuery.findOneTripBlock(query);

        if (tripBlock.tripsEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(tripBlock);
        }

        return result;
    }
}
