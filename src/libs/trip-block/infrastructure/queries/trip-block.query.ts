import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { FindManyOptions, Repository } from 'typeorm';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockQuery extends TypeOrmCrudService<TripBlockModel> {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {
        super(tripBlockRepository);
    }

    async findMany(
        options?: FindManyOptions<TripBlockModel>,
    ): Promise<TripBlockDetailsDto[]> {
        const models = await this.tripBlockRepository.find(options);
        return TripBlocksDtoBuilder.buildFromModel(models);
    }

    // async findOne(): Promise<TripBlockDetailsDto> {
    //     const model = await this.tripBlockRepository.findOne();
    //     return TripBlockDtoBuilder.buildFromModel(model);
    // }

    // =========================================================================

    async findManyTripBlocks(
        query: CrudRequest,
    ): Promise<
        TripBlockDetailsDto[] | GetManyDefaultResponse<TripBlockDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return TripBlocksDtoBuilder.buildFromModel(models);
        } else {
            const data = TripBlocksDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneTripBlock(query: CrudRequest): Promise<TripBlockDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findOneTripBlockByTripBlockId(
        tripBlockId: string,
    ): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .where('tripBlock.id = :tripBlockId', { tripBlockId })
            .getOne();
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findOneTripBlockByTripId(
        tripId: string,
    ): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .where('trips.id = :tripId', { tripId })
            .getOne();
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
    }): Promise<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection } = params;
        const models = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
                { calendarId, tripDirection },
            )
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .leftJoinAndSelect('tripOperationLists.operation', 'operation')
            .leftJoinAndSelect('trips.tripClass', 'tripClass')
            .orderBy('times.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('times.departureTime', 'ASC', 'NULLS LAST')
            .getMany();
        return TripBlocksDtoBuilder.buildFromModel(models);
    }

    async findOneById(params: {
        id: string;
    }): Promise<TripBlockDetailsDto | null> {
        const { id } = params;
        const model = await this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select('tripBlock')
            .leftJoinAndSelect('tripBlock.trips', 'trips')
            .leftJoinAndSelect('trips.times', 'times')
            .leftJoinAndSelect('trips.tripOperationLists', 'tripOperationLists')
            .leftJoinAndSelect('tripOperationLists.operation', 'operation')
            .leftJoinAndSelect('trips.tripClass', 'tripClass')
            .where('tripBlock.id = :id', { id })
            .orderBy('times.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('times.departureTime', 'ASC', 'NULLS LAST')
            .getOne();
        if (!model) return null;
        return TripBlockDtoBuilder.buildFromModel(model);
    }
}
