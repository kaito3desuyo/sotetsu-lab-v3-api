import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassesDtoBuilder } from '../builders/trip-class.dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable()
export class TripClassQuery extends TypeOrmCrudService<TripClassModel> {
    constructor(
        @InjectRepository(TripClassModel)
        private readonly tripClassRepository: Repository<TripClassModel>,
    ) {
        super(tripClassRepository);
    }

    async findMany(params?: {
        serviceId?: string;
    }): Promise<TripClassDetailsDto[]> {
        const { serviceId } = params ?? {};

        let qb = this.tripClassRepository
            .createQueryBuilder('tripClass')
            .select('tripClass');

        if (serviceId) {
            qb = qb.where('tripClass.service_id = :serviceId', { serviceId });
        }

        const models = await qb.getMany();
        return TripClassesDtoBuilder.buildFromModel(models);
    }

    async findManyTripClasses(
        query: CrudRequest,
    ): Promise<
        TripClassDetailsDto[] | GetManyDefaultResponse<TripClassDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return TripClassesDtoBuilder.buildFromModel(models);
        } else {
            const data = TripClassesDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }
}
