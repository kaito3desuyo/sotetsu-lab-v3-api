import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { buildServiceDetailsDto } from '../builders/service-dto.builder';
import { ServiceModel } from '../models/service.model';

@Injectable()
export class ServiceQuery extends TypeOrmCrudService<ServiceModel> {
    constructor(
        @InjectRepository(ServiceModel)
        private readonly serviceRepository: Repository<ServiceModel>,
    ) {
        super(serviceRepository);
    }

    async findManyServices(
        query: CrudRequest,
    ): Promise<
        ServiceDetailsDto[] | GetManyDefaultResponse<ServiceDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildServiceDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildServiceDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneServices(query: CrudRequest): Promise<ServiceDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildServiceDetailsDto(model);
    }
}
