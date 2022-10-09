import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TripCommand } from 'src/libs/trip/infrastructure/commands/trip.command';
import { TripQuery } from 'src/libs/trip/infrastructure/queries/trip.query';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlocksDomainBuilder } from './builders/trip-block.domain.builder';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';
import { AddTripToTripBlockParam } from './params/add-trip-to-trip-block.param';
import { DeleteTripFromTripBlockParam } from './params/delete-trip-from-trip-block.param';

@Injectable()
export class TripBlockV2Service {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
        private readonly tripCommand: TripCommand,
        private readonly tripQuery: TripQuery,
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
        const domains = TripBlocksDomainBuilder.buildFromCreateDto(dtos);
        const result = await this.tripBlockCommand.createManyTripBlocks(
            query,
            domains,
        );
        return result;
    }

    async addTripToTripBlock(
        params: AddTripToTripBlockParam,
    ): Promise<TripBlockDetailsDto> {
        const [tripBlock, trip] = await Promise.all([
            this.tripBlockQuery.findOneTripBlockById(params.tripBlockId),
            this.tripQuery.findOneTripById(params.tripId),
        ]);

        if (!tripBlock || !trip) {
            throw new NotFoundException('TripBlock or Trip not found.');
        }

        await this.tripCommand.updateTripBlockId(trip.id, tripBlock.id);

        const tripCountInBeforeUpdateTripBlock = await this.tripQuery.countTripByTripBlockId(
            trip.tripBlockId,
        );

        if (tripCountInBeforeUpdateTripBlock === 0) {
            await this.tripBlockCommand.deleteTripBlockById(trip.tripBlockId);
        }

        const updatedTripBlock = await this.tripBlockQuery.findOneTripBlockById(
            params.tripBlockId,
            { relations: ['trips'] },
        );

        return updatedTripBlock;
    }

    async deleteTripFromTripBlock(
        params: DeleteTripFromTripBlockParam,
    ): Promise<TripBlockDetailsDto> {
        const [tripBlock, trip] = await Promise.all([
            this.tripBlockQuery.findOneTripBlockById(params.tripBlockId, {
                relations: ['trips'],
            }),
            this.tripQuery.findOneTripById(params.tripId),
        ]);

        if (!tripBlock || !trip) {
            throw new NotFoundException('TripBlock or Trip not found.');
        }

        if (!tripBlock.trips.some((o) => o.id === trip.id)) {
            throw new BadRequestException('Trip is not in TripBlock.');
        }

        const emptyTripBlock = await this.tripBlockCommand.createEmptyTripBlock();

        await this.tripCommand.updateTripBlockId(trip.id, emptyTripBlock.id);

        const tripCountInBeforeDeleteTripBlock = await this.tripQuery.countTripByTripBlockId(
            trip.tripBlockId,
        );

        if (tripCountInBeforeDeleteTripBlock === 0) {
            await this.tripBlockCommand.deleteTripBlockById(trip.tripBlockId);
        }

        const deletedTripBlock = await this.tripBlockQuery.findOneTripBlockById(
            params.tripBlockId,
            { relations: ['trips'] },
        );

        return deletedTripBlock;
    }
}
