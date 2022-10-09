import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripDtoBuilder, TripsDtoBuilder } from '../builders/trip.dto.builder';
import { TripModel } from '../models/trip.model';

@Injectable()
export class TripQuery extends TypeOrmCrudService<TripModel> {
    constructor(
        @InjectRepository(TripModel)
        private readonly tripRepository: Repository<TripModel>,
    ) {
        super(tripRepository);
    }

    async findManyTrips(
        query: CrudRequest,
    ): Promise<TripDetailsDto[] | GetManyDefaultResponse<TripDetailsDto>> {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return TripsDtoBuilder.buildFromModel(models);
        } else {
            const data = TripsDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneTripById(tripId: string): Promise<TripDetailsDto> {
        const model = await this.tripRepository.findOne(tripId);
        return TripDtoBuilder.buildFromModel(model);
    }

    async countTripByTripBlockId(tripBlockId: string): Promise<number> {
        const count = await this.tripRepository.count({
            where: {
                tripBlockId,
            },
        });
        return count;
    }
}
