import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { isArray } from 'lodash';
import { FindManyOptions, FindOneOptions, SelectQueryBuilder } from 'typeorm';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder';
import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockRepository } from '../repositories/trip-block.repository';

@Injectable()
export class TripBlockQuery {
    constructor(private readonly tripBlockRepository: TripBlockRepository) {}

    async findMany(
        options?: FindManyOptions<TripBlockModel>,
    ): Promise<TripBlockDetailsDto[]> {
        const models = await this.tripBlockRepository.find(options);
        return TripBlocksDtoBuilder.buildFromModel(models);
    }

    async findOne(): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository.findOne();
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    // =========================================================================

    async findManyTripBlocks(
        query: CrudRequest,
    ): Promise<
        TripBlockDetailsDto[] | GetManyDefaultResponse<TripBlockDetailsDto>
    > {
        const models = await this.tripBlockRepository.getMany(query);

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
        const model = await this.tripBlockRepository.getOne(query);
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findOneTripBlockByTripBlockId(
        tripBlockId: string,
        options?: FindOneOptions<TripBlockModel>,
    ): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository.findOne({
            ...options,
            join: {
                alias: 'tripBlock',
                leftJoinAndSelect: {
                    trips: 'tripBlock.trips',
                    times: 'trips.times',
                    tripOperationLists: 'trips.tripOperationLists',
                },
            },
            where: (qb: SelectQueryBuilder<TripBlockModel>) => {
                qb.where('tripBlock.id = :tripBlockId', { tripBlockId });
            },
        });
        return TripBlockDtoBuilder.buildFromModel(model);
    }

    async findOneTripBlockByTripId(
        tripId: string,
        options?: FindOneOptions<TripBlockModel>,
    ): Promise<TripBlockDetailsDto> {
        const model = await this.tripBlockRepository.findOne({
            ...options,
            join: {
                alias: 'tripBlock',
                leftJoinAndSelect: {
                    trips: 'tripBlock.trips',
                    times: 'trips.times',
                    tripOperationLists: 'trips.tripOperationLists',
                },
            },
            where: (qb: SelectQueryBuilder<TripBlockModel>) => {
                qb.where('trips.id = :tripId', { tripId });
            },
        });
        return TripBlockDtoBuilder.buildFromModel(model);
    }
}
