import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import {
    buildTripClassDetailsDto,
    TripClassesDtoBuilder,
} from '../builders/trip-class-dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable()
export class TripClassQuery extends TypeOrmCrudService<TripClassModel> {
    constructor(
        @InjectRepository(TripClassModel)
        private readonly tripClassRepository: Repository<TripClassModel>,
    ) {
        super(tripClassRepository);
    }

    async findMany(): Promise<TripClassDetailsDto[]> {
        const models = await this.tripClassRepository.find();
        return TripClassesDtoBuilder.toDetailsDtos(models);
    }

    async findManyTripClasses(
        query: CrudRequest,
    ): Promise<
        TripClassDetailsDto[] | GetManyDefaultResponse<TripClassDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildTripClassDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildTripClassDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }
}
