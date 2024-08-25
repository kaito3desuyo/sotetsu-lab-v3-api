import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
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
            where: {
                id: tripBlockId,
            },
            // (qb: SelectQueryBuilder<TripBlockModel>) => {
            //     qb.where('tripBlock.id = :tripBlockId', { tripBlockId });
            // },
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
            where: {
                trips: {
                    id: tripId,
                },
            },
            // (qb: SelectQueryBuilder<TripBlockModel>) => {
            //     qb.where('trips.id = :tripId', { tripId });
            // },
        });
        return TripBlockDtoBuilder.buildFromModel(model);
    }
}
