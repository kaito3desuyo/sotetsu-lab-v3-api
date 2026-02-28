import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import {
    buildServiceDetailsDto,
    ServiceDtoBuilder,
} from '../builders/service-dto.builder';
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

    async findOneService(query: CrudRequest): Promise<ServiceDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildServiceDetailsDto(model);
    }

    async findOneWithRoutes(params: {
        serviceId: string;
    }): Promise<ServiceRoutesDto | null> {
        const { serviceId } = params;

        const model = await this.serviceRepository.findOne({
            where: { id: serviceId },
            relations: ['operatingSystems', 'operatingSystems.route'],
        });

        if (!model) {
            return null;
        }

        return ServiceDtoBuilder.toRoutesDto(model);
    }
}
