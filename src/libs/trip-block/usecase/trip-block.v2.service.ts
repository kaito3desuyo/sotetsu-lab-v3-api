import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { UniqueEntityId } from 'src/core/class/unique-entity-id';
import { TripCommand } from 'src/libs/trip/infrastructure/commands/trip.command';
import { TripQuery } from 'src/libs/trip/infrastructure/queries/trip.query';
import { TripBlocks } from '../domain/trip-block.domain';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import {
    TripBlockDomainBuilder,
    TripBlocksDomainBuilder,
} from './builders/trip-block.domain.builder';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';
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
